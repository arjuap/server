"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const environment_1 = require("./config/environment");
const webhook_routes_1 = __importDefault(require("./webhook-routes"));
// Create Express app
const app = (0, express_1.default)();
const PORT = environment_1.config.port;
// Middleware
app.use((0, cors_1.default)());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
// Routes
app.use(webhook_routes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        environment: environment_1.config.nodeEnv,
        timestamp: new Date().toISOString()
    });
});
// Start the server
app.listen(PORT, () => {
    console.log(`
    🚀 Server is running on port ${PORT}
    🌎 Environment: ${environment_1.config.nodeEnv}
    ⏱️  Started at: ${new Date().toISOString()}
  `);
});
exports.default = app;
