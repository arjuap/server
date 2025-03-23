"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walmartConfig = void 0;
exports.walmartConfig = {
    name: 'Walmart',
    urlPattern: 'walmart.com',
    productPagePattern: '/ip/',
    alternatePatterns: ['/ip/.*'],
    productIdRegex: {
        primary: '/ip/(?:.*/)?(\\d+)(?:\\?|$)',
        alternate: '/ip/(?:.*/)?([\\w-]+)(?:\\?|$)',
        mobile: '/ip/(?:.*/)?([\\w-]+)(?:\\?|$)'
    },
    selectors: {
        title: 'h1[itemprop="name"]',
        price: {
            primary: 'span[itemprop="price"]',
            deals: '[data-automation-id="product-price"]',
            ourPrice: '.prod-PriceSection .price-group',
            salePrice: '[data-automation-id="sale-price"]'
        },
        image: {
            primary: 'meta[property="og:image"]',
            fallback: 'img.prod-hero-image'
        },
        originalPrice: '.prod-PriceSection .price-was',
        availability: '[data-automation-id="product-inventory-section"]'
    },
    priceFormat: {
        removeChars: /[^0-9.]/g,
        decimal: '.',
        currency: '$'
    }
};
