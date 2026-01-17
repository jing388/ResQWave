const express = require("express");
const router = express.Router();
const {
    createCriticalAlert,
    createUserInitiatedAlert,
    getMapAlert,
    getAlerts,
    getWaitlistedAlerts,
    getDispatchedAlerts,
    getUnassignedAlerts,
    getUnassignedMapAlerts,
    getWaitlistedMapAlerts,
    getAlert,
    updateAlertStatus,
} = require("../controllers/alertController");

// Create alerts
router.post("/critical", createCriticalAlert);
router.post("/user", createUserInitiatedAlert);

// Read alerts
router.get("/", getAlerts);
router.get("/map", getMapAlert);
router.get("/unassigned", getUnassignedAlerts);
router.get("/waitlist", getWaitlistedAlerts);
router.get("/dispatched", getDispatchedAlerts);
router.get("/map/unassigned", getUnassignedMapAlerts);
router.get("/map/waitlisted", getWaitlistedMapAlerts);
router.get("/:id", getAlert);

// UPDATE
router.patch("/:alertID", updateAlertStatus);

module.exports = router;
