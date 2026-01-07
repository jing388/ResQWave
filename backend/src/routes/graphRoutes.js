const express = require("express");
const router = express.Router();
const { getAlertStats, getCompletedOperationsStats } = require("../controllers/graphController");

router.get("/graph", getAlertStats);
router.get("/graph/completed-operations", getCompletedOperationsStats);

module.exports = router;