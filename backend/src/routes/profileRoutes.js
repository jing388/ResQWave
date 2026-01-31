const express = require("express");
const router = express.Router();
const { 
    getProfile, 
    requestEmailChange, 
    verifyEmailChange,
    requestNumberChange,
    verifyNumberChange, 
    changePassword,
    uploadProfilePicture,
    upload
} = require("../controllers/profileController");

router.get("/", getProfile);
router.post("/change-email", requestEmailChange);
router.post("/verify-email-change", verifyEmailChange);
router.post("/change-number", requestNumberChange);
router.post("/verify-number-change", verifyNumberChange);
router.post("/change-password", changePassword);
router.post("/photo", upload.single("photo"), uploadProfilePicture);

module.exports = router;
