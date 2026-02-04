const express = require("express");
const router = express.Router();
const { 
    getAllAlarms, 
    createAlarm, 
    getAlarmById,
    getActiveAlarms,
    getClearedAlarms,
    archiveAlarm,
    unarchiveAlarm,
    deleteAlarmPermanently,
    getArchivedAlarms,
} = require("../controllers/alarmController");

router.get("/", getAllAlarms);
router.get("/active", getActiveAlarms);
router.get("/cleared", getClearedAlarms);
router.get("/archived", getArchivedAlarms);
router.get("/:id", getAlarmById);
router.post("/", createAlarm);
router.patch ("/:id/archive", archiveAlarm);
router.patch("/:id/restore", unarchiveAlarm);
router.delete("/:id", deleteAlarmPermanently);

module.exports = router;
