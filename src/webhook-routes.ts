import express from 'express';
import { handleTwilioWebhook, handleDirectProductUrl } from './webhook-controller';
import twilio from 'twilio';
import { config } from './config/environment';
import { updateAuthToken } from './config/auth-config';
import { Request, Response } from 'express';

const router = express.Router();

// Verify Twilio requests are authentic
const twilioWebhookMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  // Skip validation in development if needed
  if (config.nodeEnv === 'development' && config.twilio.skipAuth) {
    return next();
  }

  const requestIsValid = twilio.validateRequest(
    config.twilio.authToken,
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
      const { token } = req.body;
      
      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Auth token is required'
        });
        return;
      }
      
      updateAuthToken(token);
      
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

export default router;