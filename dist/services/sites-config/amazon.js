"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.amazonConfig = void 0;
exports.amazonConfig = {
    name: 'Amazon',
    urlPattern: 'amazon.com',
    shortUrlPatterns: ['a.co', 'amzn.to', 'amzn.in'],
    productPagePattern: '/dp/',
    alternatePatterns: [
        '/gp/product/',
        '/gp/aw/d/'
    ],
    productIdRegex: {
        primary: '/dp/([A-Z0-9]{10})(?:/|$)',
        alternate: '/product/([A-Z0-9]{10})(?:/|$)',
        mobile: '/aw/d/([A-Z0-9]{10})(?:/|$)'
    },
    selectors: {
        title: '#productTitle',
        price: {
            primary: '.a-price .a-offscreen',
            deals: '#priceblock_dealprice',
            ourPrice: '#priceblock_ourprice',
            salePrice: '#priceblock_saleprice'
        },
        image: {
            primary: '#landingImage',
            fallback: 'meta[property="og:image"]'
        },
        originalPrice: '.a-text-strike',
        availability: '#availability'
    },
    priceFormat: {
        removeChars: /[^0-9.]/g,
        decimal: '.',
        currency: '$'
    }
};
