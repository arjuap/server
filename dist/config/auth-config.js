"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_TOKEN = exports.API_BASE_URL = void 0;
const environment_1 = require("./environment");
exports.API_BASE_URL = environment_1.config.api.baseUrl;
exports.AUTH_TOKEN = environment_1.config.api.authToken;
