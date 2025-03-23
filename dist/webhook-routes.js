"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const webhook_controller_1 = require("./webhook-controller");
const twilio_1 = __importDefault(require("twilio"));
const environment_1 = require("./config/environment");
const router = express_1.default.Router();
// Verify Twilio requests are authentic
const twilioWebhookMiddleware = (req, res, next) => {
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // Skip validation in development if needed
    if (environment_1.config.nodeEnv === 'development' && environment_1.config.twilio.skipAuth) {
        return next();
    }
    const requestIsValid = twilio_1.default.validateRequest(environment_1.config.twilio.authToken, twilioSignature, url, req.body);
    if (requestIsValid) {
        next();
    }
    else {
        res.status(403).send('Unauthorized request');
    }
};
// Twilio webhook endpoint
router.post('/twilio/webhook', twilioWebhookMiddleware, webhook_controller_1.handleTwilioWebhook);
// Direct product URL processing endpoint (for testing or alternative use)
router.post('/process-url', webhook_controller_1.handleDirectProductUrl);
exports.default = router;
