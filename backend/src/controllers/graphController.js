// controllers/alertStatsController.js
const { Between } = require("typeorm");
const dayjs = require("dayjs");
const { AppDataSource } = require("../config/dataSource");
const { BadRequestError } = require("../exceptions");
const catchAsync = require("../utils/catchAsync");
const alertRepo = AppDataSource.getRepository("Alert");
const rescueFormRepo = AppDataSource.getRepository("RescueForm");
const postRescueRepo = AppDataSource.getRepository("PostRescueForm");
const {
  getCache,
  setCache,
} = require("../config/cache");

const getAlertStats = catchAsync(async (req, res, next) => {
  const { type } = req.query; // daily | weekly | monthly | yearly
  
  // Cache Check
  const cacheKey = `alertStats:${type}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const now = dayjs();
  let startDate, endDate;

  switch (type) {
    case "daily":
      startDate = now.startOf("day").subtract(6, "day"); // last 7 days
      endDate = now.endOf("day");
      break;

    case "weekly":
      startDate = now.startOf("week").subtract(3, "week"); // last 4 weeks
      endDate = now.endOf("week");
      break;

    case "monthly":
      startDate = now.startOf("month").subtract(2, "month"); // last 3 months
      endDate = now.endOf("month");
      break;

    case "yearly":
      startDate = now.startOf("year").subtract(11, "month"); // last 12 months
      endDate = now.endOf("year");
      break;

    default:
      return next(new BadRequestError("Invalid type parameter"));
  }

    // fetch alerts from DB
    const alerts = await alertRepo.find({
      where: {
        dateTimeSent: Between(startDate.toDate(), endDate.toDate())
      }
    });

    const stats = {};
    for (const alert of alerts) {
      let groupKey;
      if (type === "daily") {
        groupKey = dayjs(alert.dateTimeSent).format("YYYY-MM-DD");
      } else if (type === "weekly") {
        groupKey = dayjs(alert.dateTimeSent).format("YYYY-MM-DD");
      } else if (type === "monthly") {
        const weekStart = dayjs(alert.dateTimeSent).startOf("week").format("MMM D");
        const weekEnd = dayjs(alert.dateTimeSent).endOf("week").format("D");
        groupKey = `${weekStart}-${weekEnd}`;
      } else {
        groupKey = dayjs(alert.dateTimeSent).format("MMMM");
      }
      if (!stats[groupKey]) stats[groupKey] = { userInitiated: 0, critical: 0 };
      if (alert.alertType === "User-Initiated") stats[groupKey].userInitiated++;
      else if (alert.alertType === "Critical") stats[groupKey].critical++;
    }

    const payload = { type, stats };

    // TTL Selection
    const ttlSeconds = 
    type === "daily" ? 30 :
    type === "weekly" ? 45 :
    type === "monthly" ? 120:
    300;

  await setCache(cacheKey, payload, ttlSeconds);
  return res.json({ type, stats });
});

// Get Completed Operations Stats (for admin dashboard charts)
const getCompletedOperationsStats = catchAsync(async (req, res, next) => {
  const { type, startDate: customStartDate, endDate: customEndDate } = req.query; // daily | weekly | monthly | yearly
  
  // If custom date range is provided, use it directly
  const now = dayjs();
  let startDate, endDate;

  if (customStartDate && customEndDate) {
    // Use custom date range from query parameters
    startDate = dayjs(customStartDate).startOf("day");
    endDate = dayjs(customEndDate).endOf("day");
  } else {
    // Fall back to default ranges based on type
    switch (type) {
      case "daily":
        startDate = now.startOf("day").subtract(6, "day"); // last 7 days
        endDate = now.endOf("day");
        break;

      case "weekly":
        startDate = now.startOf("week").subtract(3, "week"); // last 4 weeks
        endDate = now.endOf("week");
        break;

      case "monthly":
        startDate = now.startOf("month").subtract(2, "month"); // last 3 months
        endDate = now.endOf("month");
        break;

      case "yearly":
        startDate = now.startOf("year").subtract(11, "month"); // last 12 months
        endDate = now.endOf("year");
        break;

      default:
        return next(new BadRequestError("Invalid type parameter"));
    }
  }
    
    // Cache Check - include date range in cache key for custom ranges
    const cacheKey = customStartDate && customEndDate 
      ? `completedOpsStats:${type}:${customStartDate}:${customEndDate}`
      : `completedOpsStats:${type}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch completed rescue forms with their post-rescue completion dates
    const completedForms = await rescueFormRepo
      .createQueryBuilder("rf")
      .leftJoinAndSelect("PostRescueForm", "prf", "prf.alertID = rf.emergencyID")
      .where("rf.status = :status", { status: "Completed" })
      .andWhere("prf.completedAt BETWEEN :startDate AND :endDate", {
        startDate: startDate.toDate(),
        endDate: endDate.toDate()
      })
      .select([
        "rf.originalAlertType",
        "prf.completedAt"
      ])
      .getRawMany();

    const stats = {};
    for (const form of completedForms) {
      const completedAt = form.prf_completedAt;
      const alertType = form.rf_originalAlertType;

      if (!completedAt) continue;

      let groupKey;
      if (type === "daily") {
        groupKey = dayjs(completedAt).format("YYYY-MM-DD");
      } else if (type === "weekly") {
        groupKey = dayjs(completedAt).format("YYYY-MM-DD");
      } else if (type === "monthly") {
        const weekStart = dayjs(completedAt).startOf("week").format("MMM D");
        const weekEnd = dayjs(completedAt).endOf("week").format("D");
        groupKey = `${weekStart}-${weekEnd}`;
      } else {
        groupKey = dayjs(completedAt).format("MMMM");
      }

      if (!stats[groupKey]) stats[groupKey] = { userInitiated: 0, critical: 0 };
      
      if (alertType === "User-Initiated") {
        stats[groupKey].userInitiated++;
      } else if (alertType === "Critical") {
        stats[groupKey].critical++;
      }
    }

    const payload = { type, stats };

    // TTL Selection
    const ttlSeconds = 
      type === "daily" ? 30 :
      type === "weekly" ? 45 :
      type === "monthly" ? 120 :
      300;

  await setCache(cacheKey, payload, ttlSeconds);
  return res.json(payload);
});

module.exports = { getAlertStats, getCompletedOperationsStats };
