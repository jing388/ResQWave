const express = require("express");
const {
    requestAdminDispatcherReset,
    requestFocalReset,
    verifyResetCode,
    resetPassword,
    resendResetCode
} = require("../controllers/resetPasswordController");
const { requestResetLimiter, resendCodeLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Reset Password
router.post("/official/reset", requestResetLimiter, requestAdminDispatcherReset);
router.post("/focal/reset", requestResetLimiter, requestFocalReset);
router.post("/verifyResetCode", verifyResetCode);
router.post("/resetPassword", resetPassword);
router.post("/resendResetCode", resendCodeLimiter, resendResetCode);

module.exports = router;