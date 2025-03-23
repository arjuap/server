"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        skipAuth: process.env.SKIP_TWILIO_AUTH === 'true'
    },
    api: {
        baseUrl: process.env.API_BASE_URL || 'https://gl-api-mock.onrender.com',
        authToken: process.env.AUTH_TOKEN || ''
    }
};
