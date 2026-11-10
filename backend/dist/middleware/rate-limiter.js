"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalApiLimiter = exports.exportLimiter = exports.aiVerificationLimiter = exports.passwordResetLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Strict limiter for authentication (Login & Register brute-force prevention)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // max 20 login/register attempts per IP per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    },
});
// Strict limiter for Password Reset / OTP triggers
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // max 5 reset/OTP requests per IP per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many password reset requests from this IP. Please try again after 15 minutes.',
    },
});
// Limiter for AI Multimodal Scanning (prevents API key exhaustion & DoS)
exports.aiVerificationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // max 30 scans per 5 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'AI audit rate limit reached. Please wait a few minutes before re-scanning.',
    },
});
// Limiter for Bulk Exports (Excel / ZIP downloads)
exports.exportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 15, // max 15 bulk export operations per 5 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Bulk export rate limit reached. Please wait before exporting again.',
    },
});
// General API protection limiter
exports.generalApiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // max 120 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests. Please slow down.',
    },
});
