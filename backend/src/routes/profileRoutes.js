const express = require("express");
const router = express.Router();
const { 
    getProfile, 
    requestEmailChange, 
    verifyEmailChange, 
    changePassword 
} = require("../controllers/profileController");

router.get("/", getProfile);
router.post("/change-email", requestEmailChange);
router.post("/verify-email-change", verifyEmailChange);
router.post("/change-password", changePassword);

module.exports = router;
