const express = require("express");
const router = express.Router();
const { getAllAlarms, createAlarm, getAlarmById } = require("../controllers/alarmController");

router.get("/", getAllAlarms);
router.get("/:id", getAlarmById);
router.post("/", createAlarm);

module.exports = router;
