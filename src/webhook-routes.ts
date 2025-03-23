import express from 'express';
import { handleTwilioWebhook, handleDirectProductUrl } from './webhook-controller';
import twilio from 'twilio';
import { config } from './config/environment';
import { updateAuthToken } from './config/auth-config';
import { Request, Response } from 'express';
import { getAuthTokenByPhone, userDetails } from './config/user-details';

const router = express.Router();

// Verify Twilio requests are authentic
const twilioWebhookMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const from = req.body.From;
  
  console.log('=================================================');
  console.log('RECEIVED TWILIO WEBHOOK');
  console.log(`Mobile number: ${from}`);
  console.log('=================================================');
  
  // Skip validation in development if needed
  if (config.nodeEnv === 'development' && config.twilio.skipAuth) {
    return next();
  }

  // Get auth token for the sender's phone number
  const authToken = from ? getAuthTokenByPhone(from) : undefined;
  
  if (!authToken) {
    console.warn('No auth token found for phone number:', from);
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  const requestIsValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    req.body
  );

  if (requestIsValid) {
    next();
  } else {
    res.status(403).send('Unauthorized request');
  }
};

// Twilio webhook endpoint
router.post('/twilio/webhook', twilioWebhookMiddleware, handleTwilioWebhook);

// Direct product URL processing endpoint (for testing or alternative use)
router.post('/process-url', handleDirectProductUrl);

// New endpoint to update auth token
router.post('/update-auth-token', 
  (req: Request, res: Response): void => {
    try {
      const { token, phoneNumber } = req.body;
      
      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Auth token is required'
        });
        return;
      }
      
      console.log('=================================================');
      console.log('UPDATE AUTH TOKEN REQUEST');
      console.log(`Mobile number: ${phoneNumber || 'Not provided'}`);
      console.log('=================================================');
      
      updateAuthToken(token, phoneNumber);
      
      res.status(200).json({
        success: true,
        message: 'Auth token updated successfully'
      });
    } catch (error) {
      console.error('Error updating auth token:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Debugging endpoint to view stored user details (auth tokens)
router.get('/debug/user-details', 
  (req: Request, res: Response): void => {
    try {
      console.log('=================================================');
      console.log('CURRENT USER DETAILS (IN-MEMORY STORAGE)');
      console.log(JSON.stringify(userDetails, null, 2));
      console.log('=================================================');
      
      // Create a safe version of userDetails to return (mask auth tokens)
      const safeDetails: {[key: string]: string} = {};
      
      for (const [phoneNumber, token] of Object.entries(userDetails)) {
        const tokenPreview = token.length > 15 
          ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}`
          : '(short token)';
        
        safeDetails[phoneNumber] = tokenPreview;
      }
      
      res.status(200).json({
        success: true,
        message: 'Current user details (tokens masked for security)',
        data: safeDetails,
        count: Object.keys(userDetails).length
      });
    } catch (error) {
      console.error('Error retrieving user details:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;