import puppeteer from 'puppeteer';
import { ProductScraperService } from './product-scraper';
import { ScrapedProduct } from '../../types';

export async function scrapeProductWithPuppeteer(url: string): Promise<ScrapedProduct> {
  let browser;
  try {
    console.log(`Starting headless scraping for URL: ${url}`);
    
    // Launch a headless browser with memory-efficient settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
    
    // Navigate to the URL
    console.log('Navigating to URL...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 1200000 });
    
    // Get the final URL after all redirects
    const finalUrl = page.url();
    console.log(`Final URL after redirects: ${finalUrl}`);
    
    // Identify the site based on the final URL (not the shortened one)
    const siteConfig = ProductScraperService.identifySite(finalUrl);
    if (!siteConfig) {
      throw new Error('Unsupported site');
    }
    
    console.log(`Identified site: ${siteConfig.name}`);
    
    // Extract product information using the final URL for regex patterns
    const productInfo = await page.evaluate((config) => {
      const getTextContent = (selector: string) => {
        const element = document.querySelector(selector);
        return element ? element.textContent?.trim() : null;
      };
      
      const getImageSrc = (selector: string) => {
        const element = document.querySelector(selector);
        return element && element instanceof HTMLImageElement ? element.src : null;
      };
      
      // COMPREHENSIVE PRODUCT ID EXTRACTION
      
      // 1. Extract product ID from URL patterns
      const url = window.location.href;
      const primaryMatch = url.match(new RegExp(config.productIdRegex.primary));
      const alternateMatch = url.match(new RegExp(config.productIdRegex.alternate));
      const mobileMatch = url.match(new RegExp(config.productIdRegex.mobile));
      
      // Try to extract from meta tags if URL patterns don't match
      let productId = primaryMatch?.[1] || alternateMatch?.[1] || mobileMatch?.[1] || '';
      
      if (!productId) {
        console.log('No product ID found in URL, trying meta tags and data attributes...');
        
        // 2. Try broader URL pattern matching
        // Common patterns for product IDs in URLs
        const commonPatterns = [
          /\/([A-Za-z0-9]{5,})\/?(?:\?|$)/,  // IDs of 5+ alphanumeric chars
          /\/p\/([A-Za-z0-9-_]+)/i,          // /p/product-id pattern
          /\/dp\/([A-Za-z0-9]{5,})/,         // /dp/product-id (Amazon style)
          /product[\/=]([A-Za-z0-9-_]+)/i,   // product=id or product/id
          /item[\/=]([A-Za-z0-9-_]+)/i,      // item=id or item/id
          /\/([A-Z0-9]{9,})\/?(?:\?|$)/,     // IDs of 9+ uppercase alphanumeric chars
          /[?&]id=([A-Za-z0-9-_]+)/i         // id query parameter
        ];
        
        for (const pattern of commonPatterns) {
          const match = url.match(pattern);
          if (match && match[1]) {
            productId = match[1];
            break;
          }
        }
      }
      
      if (!productId) {
        // 3. Try extracting from meta tags - expanded list
        const metaTags = [
          'meta[property="product:retailer_item_id"]',
          'meta[property="og:product_id"]',
          'meta[name="product-id"]',
          'meta[name="productId"]',
          'meta[name="product_id"]',
          'meta[property="product:id"]',
          'meta[name="twitter:app:url:iphone"]', // Sometimes contains product ID
          'meta[property="al:ios:url"]',
          'meta[property="al:android:url"]'
        ];
        
        for (const selector of metaTags) {
          const metaTag = document.querySelector(selector);
          if (metaTag instanceof HTMLMetaElement && metaTag.content) {
            const content = metaTag.content;
            // Extract ID from content if it's a URL
            if (content.includes('/')) {
              const lastPart = content.split('/').pop();
              if (lastPart && lastPart.length > 3) {
                productId = lastPart.split('?')[0]; // Remove query params
              } else {
                productId = content;
              }
            } else {
              productId = content;
            }
            if (productId) break;
          }
        }
        
        // 4. Try data attributes on elements - expanded list
        if (!productId) {
          const dataSelectors = [
            '[data-product-id]',
            '[data-pid]',
            '[data-item-id]',
            '[data-sku]',
            '[data-product-sku]',
            '[data-id]',
            '[data-item]',
            '[data-product]',
            'form[action*="product"]', // Product forms
            '.product-form',
            '.product-details',
            '.product-container',
            '#product-details',
            '#product-form'
          ];
          
          for (const selector of dataSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              // Try common data attributes
              const dataAttributes = [
                'data-product-id', 'data-pid', 'data-item-id', 
                'data-sku', 'data-product-sku', 'data-id',
                'data-item', 'data-product', 'id'
              ];
              
              for (const attr of dataAttributes) {
                const value = element.getAttribute(attr);
                if (value && value.length > 2 && value !== 'null' && value !== 'undefined') {
                  productId = value;
                  break;
                }
              }
              
              if (productId) break;
            }
          }
        }
        
        // 5. Look for JSON-LD product data
        if (!productId) {
          const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of jsonLdScripts) {
            try {
              const jsonData = JSON.parse(script.textContent || '');
              
              // Check if it's a product
              if (jsonData['@type'] === 'Product' || 
                 (Array.isArray(jsonData['@graph']) && 
                  jsonData['@graph'].some((item: any) => item['@type'] === 'Product'))) {
                
                let productData = jsonData;
                if (jsonData['@graph']) {
                  productData = jsonData['@graph'].find((item: any) => item['@type'] === 'Product');
                }
                
                if (productData.sku) {
                  productId = productData.sku;
                } else if (productData.productID) {
                  productId = productData.productID;
                } else if (productData.mpn) {
                  productId = productData.mpn;
                } else if (productData.identifier) {
                  productId = productData.identifier;
                }
                
                if (productId) break;
              }
            } catch (e) {
              // Continue if JSON parsing fails
              continue;
            }
          }
        }
        
        // 6. Last resort: look for anything that resembles a product ID in the HTML
        if (!productId) {
          // Look for IDs in structured text
          const bodyText = document.body.textContent || '';
          const idPatterns = [
            /Product ID[:\s]+([A-Z0-9-]{4,})/i,
            /Item #[:\s]*([A-Z0-9-]{4,})/i,
            /SKU[:\s]*([A-Z0-9-]{4,})/i,
            /Model[:\s]*([A-Z0-9-]{4,})/i
          ];
          
          for (const pattern of idPatterns) {
            const match = bodyText.match(pattern);
            if (match && match[1]) {
              productId = match[1].trim();
              break;
            }
          }
        }
      }
      
      // If still no product ID, mark as unknown but use the domain + path as a fallback
      if (!productId) {
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname.replace('www.', '');
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          const lastPath = pathParts.pop() || '';
          
          if (lastPath && lastPath.length > 3 && !lastPath.includes('.')) {
            productId = `${hostname}-${lastPath}`;
          } else if (pathParts.length > 0) {
            productId = `${hostname}-${pathParts.join('-')}`;
          } else {
            productId = 'unknown';
          }
        } catch {
          productId = 'unknown';
        }
      }
      
      // Extract title
      const title = getTextContent(config.selectors.title);
      
      // Extract price
      const rawPrice = getTextContent(config.selectors.price.primary) ||
                       getTextContent(config.selectors.price.deals) ||
                       getTextContent(config.selectors.price.ourPrice) ||
                       getTextContent(config.selectors.price.salePrice);
      
      // Clean price
      const cleanPrice = rawPrice ? rawPrice.replace(/[^\d.]/g, '') : 'N/A';
      
      // Extract image
      let image = getImageSrc(config.selectors.image.primary);
      if (!image) {
        const metaImage = document.querySelector('meta[property="og:image"]');
        if (metaImage instanceof HTMLMetaElement) {
          image = metaImage.content;
        }
      }
      
      return {
        productId,
        title: title || `Product from ${config.name}`,
        price: cleanPrice || 'N/A',
        image: image || '',
        site: config.name,
        url: window.location.href  // Use the final URL after redirects
      };
    }, siteConfig);
    
    console.log('Scraped product data:', productInfo);
    
    return productInfo as ScrapedProduct;
  } catch (error) {
    console.error('Error during headless scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}