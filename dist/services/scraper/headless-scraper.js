"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeProductWithPuppeteer = scrapeProductWithPuppeteer;
const puppeteer_1 = __importDefault(require("puppeteer"));
const product_scraper_1 = require("./product-scraper");
async function scrapeProductWithPuppeteer(url) {
    let browser;
    try {
        console.log(`Starting headless scraping for URL: ${url}`);
        // Launch a headless browser
        browser = await puppeteer_1.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        // Navigate to the URL
        console.log('Navigating to URL...');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 1200000 });
        // Identify the site
        const siteConfig = product_scraper_1.ProductScraperService.identifySite(url);
        if (!siteConfig) {
            throw new Error('Unsupported site');
        }
        console.log(`Identified site: ${siteConfig.name}`);
        // Extract product information
        const productInfo = await page.evaluate((config) => {
            const getTextContent = (selector) => {
                var _a;
                const element = document.querySelector(selector);
                return element ? (_a = element.textContent) === null || _a === void 0 ? void 0 : _a.trim() : null;
            };
            const getImageSrc = (selector) => {
                const element = document.querySelector(selector);
                return element && element instanceof HTMLImageElement ? element.src : null;
            };
            // Extract product ID from URL
            const url = window.location.href;
            const primaryMatch = url.match(new RegExp(config.productIdRegex.primary));
            const alternateMatch = url.match(new RegExp(config.productIdRegex.alternate));
            const mobileMatch = url.match(new RegExp(config.productIdRegex.mobile));
            const productId = (primaryMatch === null || primaryMatch === void 0 ? void 0 : primaryMatch[1]) || (alternateMatch === null || alternateMatch === void 0 ? void 0 : alternateMatch[1]) || (mobileMatch === null || mobileMatch === void 0 ? void 0 : mobileMatch[1]) || 'unknown';
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
                url
            };
        }, siteConfig);
        console.log('Scraped product data:', productInfo);
        return productInfo;
    }
    catch (error) {
        console.error('Error during headless scraping:', error);
        throw error;
    }
    finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}
