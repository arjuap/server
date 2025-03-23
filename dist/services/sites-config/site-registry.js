"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteConfigs = void 0;
const amazon_1 = require("./amazon");
const target_1 = require("./target");
const walmart_1 = require("./walmart");
exports.siteConfigs = [
    amazon_1.amazonConfig,
    target_1.targetConfig,
    walmart_1.walmartConfig
];
