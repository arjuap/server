import { Request, Response } from 'express';
import twilio from 'twilio';
import { config } from './config/environment';
import { ProductScraperService } from './services/scraper/product-scraper';
import { scrapeProductWithPuppeteer } from './services/scraper/headless-scraper';
import { productService } from './services/ProductService';
import { WebhookResponse } from './types';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { getAuthTokenByPhone } from './config/user-details';

// Function to get Twilio client with the appropriate auth token
const getTwilioClient = (phoneNumber?: string) => {
  const authToken = phoneNumber ? getAuthTokenByPhone(phoneNumber) : config.twilio.authToken;
  return twilio(config.twilio.accountSid, authToken || config.twilio.authToken);
};

/**
 * Handle the Twilio webhook request
 */
export const handleTwilioWebhook = async (req: Request, res: Response) => {
  try {
    console.log('Received webhook payload:', req.body);

    // Get the sender's phone number and check for stored auth token
    const from = req.body.From;
    const storedAuthToken = from ? getAuthTokenByPhone(from) : undefined;
    
    if (!storedAuthToken) {
      console.log('No stored auth token found for phone number:', from);
      const noAuthMessage = 'Please register first to use this service.';
      if (req.body.ConversationSid) {
        await sendTwilioResponse(req.body.ConversationSid, noAuthMessage, from);
      } else if (from) {
        await sendTwilioWhatsAppResponse(from, req.body.To, noAuthMessage, from);
      }
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check if we have a direct URL field in the request (from your webhook format)
    const urlField = req.body.url || '';
    
    // If the webhook sends a JSON with a url field, process that first
    if (urlField) {
      console.log('Processing URL field from webhook JSON:', urlField);
      
      // Extract just the URL portion from the potentially mixed text
      const extractedUrl = extractUrlFromMessage(urlField);
      
      if (!extractedUrl) {
        res.status(400).json({
          success: false,
          message: 'No valid URL found in the request. Please provide a valid product URL.'
        });
        return;
      }
      
      console.log('Extracted clean URL from webhook payload:', extractedUrl);
      
      // Process the extracted URL with the stored auth token
      const result = await processProductUrl(extractedUrl, storedAuthToken);
      res.json(result);
      return;
    }
    
    // If it's a regular Twilio webhook (fallback to existing code)
    const messageBody = req.body.Body || '';
    const conversationSid = req.body.ConversationSid;
    const to = req.body.To;

    console.log('Processing message body:', messageBody);

    // Step 1: Extract ONLY the URL from the message
    const extractedUrl = extractUrlFromMessage(messageBody);
    
    if (!extractedUrl) {
      const noUrlMessage = 'Please send a product URL to save it.';
      console.log('No URL found in message, sending response:', noUrlMessage);
      
      if (conversationSid) {
        await sendTwilioResponse(conversationSid, noUrlMessage, from);
      } else if (from) {
        await sendTwilioWhatsAppResponse(from, to, noUrlMessage, from);
      }
      res.status(200).send();
      return;
    }
    
    console.log('Processing extracted URL:', extractedUrl);

    // Process only the extracted URL with the stored auth token
    const result = await processProductUrl(extractedUrl, storedAuthToken);
    
    const responseMessage = result.message;
    console.log('Sending response:', responseMessage);
    
    if (conversationSid) {
      await sendTwilioResponse(conversationSid, responseMessage, from);
    } else if (from) {
      await sendTwilioWhatsAppResponse(from, to, responseMessage, from);
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
async function processProductUrl(url: string, authToken?: string): Promise<WebhookResponse> {
  try {
    console.log('Processing URL input:', url);
    
    // Double-check if the URL might contain mixed text and extract again
    if (url.length > 100 && url.includes('http')) { // Likely contains text + URL
      const extractedUrl = extractUrlFromMessage(url);
      if (extractedUrl) {
        console.log('Re-extracted URL from mixed text:', extractedUrl);
        url = extractedUrl; // Use the clean URL
      }
    }
    
    // Final URL format validation
    try {
      new URL(url);
    } catch (e) {
      console.error('Invalid URL format:', url);
      return {
        success: false,
        message: "Sorry, the URL format is invalid. Please send a valid product URL."
      };
    }
    
    // Identify the site first
    const siteConfig = ProductScraperService.identifySite(url);
    
    if (!siteConfig) {
      return {
        success: false,
        message: "Sorry, this site is not supported for product saving."
      };
    }
    
    // Check if it's a shortened URL by looking at shortUrlPatterns
    const isShortUrl = siteConfig.shortUrlPatterns?.some(pattern => url.includes(pattern)) || false;
    
    // If it's a shortened URL, resolve it first
    let processUrl = url;
    if (isShortUrl) {
      processUrl = await resolveShortUrl(url);
    }
    
    // Now check if it's a product page using the resolved URL
    const isProductPage = ProductScraperService.isProductPage(processUrl, siteConfig);
    
    if (!isProductPage) {
      return { 
        success: false, 
        message: 'The URL does not appear to be a product page.' 
      };
    }

    // Use puppeteer to scrape the product data with the provided auth token
    console.log('Starting product scraping...');
    const scrapedProduct = await scrapeProductWithPuppeteer(processUrl);
    
    if (!scrapedProduct) {
      return {
        success: false,
        message: "Sorry, we couldn't extract the product information from this page."
      };
    }

    // Store the product with the auth token if provided
    if (authToken) {
      productService.setAuthToken(authToken);
    }
    await productService.storeProduct(scrapedProduct);

    return {
      success: true,
      message: "Product saved successfully! We'll notify you of any price changes."
    };
  } catch (error) {
    console.error('Error processing product URL:', error);
    return {
      success: false,
      message: "Sorry, there was an error processing your request. Please try again later."
    };
  }
}

/**
 * Send a message back to a Twilio conversation
 */
async function sendTwilioResponse(conversationSid: string, message: string, fromPhone?: string) {
  try {
    if (!conversationSid) {
      console.warn('No conversation SID provided, cannot send Twilio response');
      return;
    }
    
    const twilioClient = getTwilioClient(fromPhone);
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
async function sendTwilioWhatsAppResponse(to: string, from: string, message: string, fromPhone?: string) {
  try {
    if (!to || !from) {
      console.warn('Missing to/from information, cannot send WhatsApp response');
      return;
    }
    
    const twilioClient = getTwilioClient(fromPhone);
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

// Updated resolveShortUrl function to be more defensive
async function resolveShortUrl(url: string): Promise<string> {
  let browser;
  try {
    // Log the exact URL we're trying to resolve
    console.log('Starting URL resolution for:', url);
    
    // Strict URL validation - must be a valid URL before proceeding
    try {
      new URL(url);
    } catch (e) {
      console.error('Invalid URL format, cannot resolve:', url);
      return url; // Return original if URL is invalid
    }
    
    console.log('URL validated, launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000);
    
    console.log('Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const resolvedUrl = page.url();
    console.log('Successfully resolved to:', resolvedUrl);
    return resolvedUrl;
  } catch (error) {
    console.error('Error during URL resolution:', error);
    return url; // Return original if resolution fails
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed after URL resolution');
    }
  }
}

/**
 * Extract a clean product URL from a message text
 */
function extractUrlFromMessage(message: string): string | null {
  if (!message) return null;
  
  console.log('Raw message to extract URL from:', message);
  
  // Simple and direct approach
  const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) return null;
  
  let extractedUrl = urlMatch[0];
  
  // Clean any trailing punctuation
  extractedUrl = extractedUrl.replace(/[.,;:)\]}"']+$/, '');
  
  console.log('FINAL EXTRACTED URL:', extractedUrl);
  return extractedUrl;
}