"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetConfig = void 0;
exports.targetConfig = {
    name: 'Target',
    urlPattern: 'target.com',
    productPagePattern: '/A-\\d{8}',
    alternatePatterns: [],
    productIdRegex: {
        primary: '/A-(\\d{8})',
        alternate: '/A-(\\d{8})',
        mobile: '/A-(\\d{8})'
    },
    selectors: {
        title: '[data-test="product-title"]',
        price: {
            primary: '[data-test="product-price"]',
            deals: '[data-test="product-price"]',
            ourPrice: '[data-test="product-price"]',
            salePrice: '[data-test="product-price"]'
        },
        image: {
            primary: '[data-test="product-image"]',
            fallback: 'meta[property="og:image"]'
        },
        originalPrice: '.styles__StyledPricePromotion-sc-1p',
        availability: '[data-test="availability-message"]'
    },
    priceFormat: {
        removeChars: /[^0-9.]/g,
        decimal: '.',
        currency: '$'
    }
};
