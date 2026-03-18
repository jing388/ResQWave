const express = require("express");
const {
    register,
    getCurrentUser,
    adminDispatcherLogin,
    adminDispatcherVerify,
    focalLogin,
    resendFocalLoginCode,
    resendAdminDispatcherCode,
    verifyFocalLogin,
    refreshAccessToken,
    logout,
} = require("../controllers/authController");


const router = express.Router();

router.post("/register", register);
router.post("/login", adminDispatcherLogin);
router.post("/resend", resendAdminDispatcherCode);
router.post("/verify-login", adminDispatcherVerify);
router.post("/focal/login", focalLogin);
router.post("/focal/resend", resendFocalLoginCode);
router.post("/focal/verify", verifyFocalLogin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", getCurrentUser);


module.exports = router;