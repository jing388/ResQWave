const express = require("express");
const router = express.Router();
const { 
    getAdminDashboardStats, 
    getAggregatedMapData 
} = require("../controllers/adminDashboard");

router.get("/stats", getAdminDashboardStats);
router.get("/map", getAggregatedMapData);

module.exports = router;
