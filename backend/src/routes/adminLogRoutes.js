const express = require("express");
const router = express.Router();
const { getAdminLogs } = require("../controllers/adminLogController");

router.get("/", getAdminLogs);

module.exports = router;
