const express = require("express");
const router = express.Router();
const { handleUplink } = require("../lms/uplink");

// LMS POST endpoint
router.post("/uplink", handleUplink);

module.exports = router;
