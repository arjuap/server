"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductScraperService = void 0;
const site_registry_1 = require("../sites-config/site-registry");
class ProductScraperService {
    static identifySite(url) {
        // First check for the main URL pattern
        const config = site_registry_1.siteConfigs.find(config => url.includes(config.urlPattern));
        if (config)
            return config;
        // If not found, check for shortened URL patterns
        const configByShortUrl = site_registry_1.siteConfigs.find(config => { var _a; return (_a = config.shortUrlPatterns) === null || _a === void 0 ? void 0 : _a.some(pattern => url.includes(pattern)); });
        return configByShortUrl || null;
    }
    static isProductPage(url, config) {
        console.log('Checking if product page:', {
            url,
            pattern: config.productPagePattern,
            alternatePatterns: config.alternatePatterns
        });
        const primaryRegex = new RegExp(config.productPagePattern);
        if (primaryRegex.test(url))
            return true;
        if (config.alternatePatterns) {
            return config.alternatePatterns.some(pattern => {
                const regex = new RegExp(pattern);
                return regex.test(url);
            });
        }
        return false;
    }
    static extractProductId(url, config) {
        // Try primary pattern first
        const primaryMatch = url.match(new RegExp(config.productIdRegex.primary));
        if (primaryMatch)
            return primaryMatch[1];
        // Try alternate patterns
        const alternateMatch = url.match(new RegExp(config.productIdRegex.alternate));
        if (alternateMatch)
            return alternateMatch[1];
        // Try mobile pattern
        const mobileMatch = url.match(new RegExp(config.productIdRegex.mobile));
        if (mobileMatch)
            return mobileMatch[1];
        return null;
    }
    static formatPrice(price, config) {
        if (!price)
            return 'N/A';
        const cleanPrice = price.replace(config.priceFormat.removeChars, '');
        if (!cleanPrice || isNaN(parseFloat(cleanPrice)))
            return 'N/A';
        return `${config.priceFormat.currency}${parseFloat(cleanPrice).toFixed(2)}`;
    }
}
exports.ProductScraperService = ProductScraperService;
