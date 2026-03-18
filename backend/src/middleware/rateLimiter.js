const rateLimit = require("express-rate-limit");

const requestResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: "Too many reset requests from this IP, please try again after 15 minutes" },
});

const resendCodeLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3,
    message: { error: "Too many resend requests from this IP, please try again after 10 minutes" },
});

const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});

module.exports = {
    requestResetLimiter,
    resendCodeLimiter,
    generalApiLimiter
};