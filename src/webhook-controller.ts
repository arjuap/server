import { Request, Response } from 'express';
import twilio from 'twilio';
import { config } from './config/environment';
import { ProductScraperService } from './services/scraper/product-scraper';
import { scrapeProductWithPuppeteer } from './services/scraper/headless-scraper';
import { productService } from './services/ProductService';
import { WebhookResponse } from './types';

// Initialize Twilio client
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * Handle the Twilio webhook request
 */
export const handleTwilioWebhook = async (req: Request, res: Response) => {
  try {
    console.log('Received webhook from Twilio:', req.body);

    // Extract the message body and sender information
    const messageBody = req.body.Body || '';
    const conversationSid = req.body.ConversationSid;
    const from = req.body.From; // WhatsApp number that sent the message
    const to = req.body.To;     // Your Twilio WhatsApp number

    // Check if the message contains a URL
    const urlMatch = messageBody.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      if (conversationSid) {
        // Use Conversations API if conversationSid exists
        await sendTwilioResponse(conversationSid, 'Please send a product URL to save it.');
      } else if (from) {
        // Use Messaging API for WhatsApp if from exists
        await sendTwilioWhatsAppResponse(from, to, 'Please send a product URL to save it.');
      }
      res.status(200).send();
      return;
    }

    const productUrl = urlMatch[0];
    console.log('Extracted URL:', productUrl);

    // Process the URL
    const result = await processProductUrl(productUrl);
    
    // Send response back based on available channel info
    if (conversationSid) {
      await sendTwilioResponse(conversationSid, result.message);
    } else if (from) {
      await sendTwilioWhatsAppResponse(from, to, result.message);
    }
    
    res.status(200).send();
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal server error');
  }
};

/**
 * Handle direct product URL processing API endpoint
 */
export const handleDirectProductUrl = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      res.status(400).json({
        success: false,
        message: 'Product URL is required'
      });
      return;
    }
    
    const result = await processProductUrl(url);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error processing product URL:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Process a product URL by scraping and storing it
 */
async function processProductUrl(url: string): Promise<WebhookResponse> {
  try {
    // Check if the URL is for a supported site
    const siteConfig = ProductScraperService.identifySite(url);
    if (!siteConfig) {
      return { 
        success: false, 
        message: 'Sorry, this site is not supported for product saving.' 
      };
    }

    // Check if it's a product page
    if (!ProductScraperService.isProductPage(url, siteConfig)) {
      return { 
        success: false, 
        message: 'The URL does not appear to be a product page.' 
      };
    }

    // Use puppeteer to scrape the product data
    console.log('Starting product scraping...');
    const scrapedProduct = await scrapeProductWithPuppeteer(url);
    
    if (!scrapedProduct || !scrapedProduct.title || !scrapedProduct.productId) {
      return { 
        success: false, 
        message: 'Unable to extract product information from the page.' 
      };
    }
    
    // Store the product in the database
    console.log('Storing product in database...');
    await productService.storeProduct(scrapedProduct);
    
    return { 
      success: true, 
      message: `Your product "${scrapedProduct.title}" from ${scrapedProduct.site} has been saved! You can view it in your saved products list.`,
      data: scrapedProduct
    };
  } catch (error) {
    console.error('Error processing product URL:', error);
    return { 
      success: false, 
      message: 'Sorry, there was an error saving your product. Please try again later.' 
    };
  }
}

/**
 * Send a message back to a Twilio conversation
 */
async function sendTwilioResponse(conversationSid: string, message: string) {
  try {
    if (!conversationSid) {
      console.warn('No conversation SID provided, cannot send Twilio response');
      return;
    }
    
    await twilioClient.conversations.v1.conversations(conversationSid)
      .messages
      .create({ body: message });
      
    console.log('Twilio response sent successfully');
  } catch (error) {
    console.error('Error sending Twilio response:', error);
  }
}

/**
 * Send a message back via Twilio WhatsApp
 */
async function sendTwilioWhatsAppResponse(to: string, from: string, message: string) {
  try {
    if (!to || !from) {
      console.warn('Missing to/from information, cannot send WhatsApp response');
      return;
    }
    
    await twilioClient.messages.create({
      body: message,
      from: from,
      to: to
    });
      
    console.log('Twilio WhatsApp response sent successfully');
  } catch (error) {
    console.error('Error sending Twilio WhatsApp response:', error);
  }
}