const express = require("express");
const router = express.Router();

const {
    createPostRescueForm,
    getPendingReports,
    getCompletedReports,
    getAggregatedRescueReports,
    getAggregatedPostRescueForm,
    clearReportsCache,
    migrateOriginalAlertTypes,
    fixRescueFormStatus,
    getAlertTypeChartData,
    getDetailedReportData,
    archivePostRescueForm,
    getArchivedPostRescueForm,
} = require("../controllers/postRescueFormController");


router.post("/:alertID", createPostRescueForm);
router.get("/pending", getPendingReports);
router.get("/completed", getCompletedReports);
router.get("/chart/alert-types", getAlertTypeChartData);
router.get("/report/:alertId", getDetailedReportData);
router.get("/aggregated", getAggregatedRescueReports);
router.get("/table/aggregated", getAggregatedPostRescueForm);
router.get("/archived", getArchivedPostRescueForm);
router.delete("/archive/:alertID", archivePostRescueForm);
router.delete("/cache", clearReportsCache);
router.post("/migrate/alert-types", migrateOriginalAlertTypes);
router.post("/fix/rescue-form-status", fixRescueFormStatus);

module.exports = router;