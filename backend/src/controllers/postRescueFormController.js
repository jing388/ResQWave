const { AppDataSource } = require("../config/dataSource");
const alertRepo = AppDataSource.getRepository("Alert");
const postRescueRepo = AppDataSource.getRepository("PostRescueForm");
const rescueFormRepo = AppDataSource.getRepository("RescueForm");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const { getCache, setCache, deleteCache } = require("../config/cache");
const { getIO } = require("../realtime/socket");
const catchAsync = require("../utils/catchAsync");
const { sendDownlink } = require("../lms/downlink");
const { NotFoundError, BadRequestError } = require("../exceptions");

// CREATE POST RESCUE FORM
const createPostRescueForm = catchAsync(async (req, res, next) => {
    const {alertID} = req.params;
    const { noOfPersonnelDeployed, resourcesUsed, actionTaken} = req.body;

    // Check if the Alert Exist
    const alert = await alertRepo.findOne({
        where: {id: alertID},
        relations: ["terminal"]
    });
    if (!alert) return next(new NotFoundError("Alert Not Found"));

    // Only Allowed if the Alert is "Dispatched"
    if (alert.status !== "Dispatched") {
        return next(new BadRequestError("Please Dispatched a Rescue Team First"));
    }

    const rescueForm = await rescueFormRepo.findOne({ where: {emergencyID: alertID} });
    if (!rescueForm) {
        return next(new BadRequestError("Rescue Form Not Found"));
    }
        
    // Prevent Duplication
    const existing = await postRescueRepo.findOne({where: {alertID} });
    if (existing) return next(new BadRequestError("Post Rescue Form Already Exists"));

    // Create the Post Rescue Form
    // TypeORM with JSON type will automatically handle serialization
    const newForm = postRescueRepo.create({
        alertID,
        noOfPersonnelDeployed,
        resourcesUsed,
        actionTaken,
        completedAt: new Date()
    });

    await postRescueRepo.save(newForm);

    // Update Rescue Form Status -> Completed (marks the rescue as finished)
    rescueForm.status = "Completed";
    await rescueFormRepo.save(rescueForm);

    // Trigger LoRaWAN Downlink for Completed status
    if (!alert.terminal?.devEUI) {
        console.warn(`[Downlink Skipped] Terminal has no DevEUI for alert ${alert.id}`);
    } else {
        try {
            await sendDownlink(alert.terminal.devEUI, "Completed");
            console.log(`[PostRescue] Downlink sent successfully for status: Completed`);
        } catch (downlinkError) {
            console.error('[PostRescue] LoRaWAN queuing failed:', downlinkError.message);
        }
    }

    // Emit socket event for real-time updates
    try {
        const io = getIO();
        io.to("alerts:all").emit("postRescue:created", {
            alertId: alertID,
            rescueFormId: rescueForm.id,
            status: "Completed",
            completedAt: newForm.completedAt
        });
        console.log('[PostRescue] Emitted postRescue:created event for alert:', alertID);
    } catch (err) {
        console.error('[PostRescue] Failed to emit socket event:', err);
    }

    // Cache invalidation - clear all relevant caches immediately for real-time updates
    await deleteCache("completedReports");
    await deleteCache("pendingReports");
    await deleteCache("rescueForms:all");
    await deleteCache(`rescueForm:${rescueForm.id}`);
    await deleteCache(`alert:${alertID}`);
    await deleteCache("aggregatedReports:all");
    await deleteCache("aggregatedPRF:all");
    await deleteCache(`rescueAggregatesBasic:all`);
    await deleteCache(`rescueAggregatesBasic:${alertID}`);
    await deleteCache(`aggregatedReports:${alertID}`);
    await deleteCache(`aggregatedPRF:${alertID}`);
    await deleteCache("adminDashboardStats");

    return res.status(201).json({message: "Post Rescue Form Created", newForm});
});

// GET Completed Reports
const getCompletedReports = catchAsync(async (req, res, next) => {
  const cacheKey = "completedReports";
    const bypassCache = req.query.refresh === 'true';
    
    // Check cache only if not bypassing
    if (!bypassCache) {
      const cached = await getCache(cacheKey);
      if (cached) {
        res.set('Cache-Control', 'public, max-age=300');
        return res.json(cached);
      }
    }

    const reports = await alertRepo
      .createQueryBuilder("alert")
      .leftJoin("alert.terminal", "terminal")
      .leftJoin("Neighborhood", "n", "n.terminalID = terminal.id")
      .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
      .leftJoin("RescueForm", "rescueForm", "rescueForm.emergencyID = alert.id")
      .leftJoin("Dispatcher", "dispatcher", "dispatcher.id = rescueForm.dispatcherID")
      .leftJoin("PostRescueForm", "prf", "prf.alertID = alert.id")
      .where("rescueForm.status = :status", { status: "Completed" })
      .andWhere("(prf.archived IS NULL OR prf.archived = :archived)", { archived: false })
      .select([
        "alert.id AS \"alertId\"",
        "terminal.name AS \"terminalName\"",
        "rescueForm.originalAlertType AS \"alertType\"", // Use original alert type from rescue form
        "dispatcher.name AS \"dispatcherName\"",
        "rescueForm.status AS \"rescueStatus\"",
        "alert.dateTimeSent AS \"createdAt\"",
        "prf.completedAt AS \"completedAt\"",
        "fp.address AS \"address\"",
      ])
      .orderBy("alert.dateTimeSent", "ASC")
      .getRawMany();

    // Update cache with fresh data (shorter TTL for faster refresh after new reports)
    await setCache(cacheKey, reports, 30);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(reports);
});

const getPendingReports = catchAsync(async (req, res, next) => {
  const cacheKey = "pendingReports";
    const bypassCache = req.query.refresh === 'true';
    
    // Check cache only if not bypassing
    if (!bypassCache) {
      const cached = await getCache(cacheKey);
      if (cached) {
        res.set('Cache-Control', 'public, max-age=300');
        return res.json(cached);
      }
    }

    const pending = await alertRepo
      .createQueryBuilder("alert")
      .leftJoin("alert.terminal", "terminal")
      .leftJoin("Neighborhood", "n", "n.terminalID = terminal.id")
      .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
      .leftJoin("RescueForm", "rescueForm", "rescueForm.emergencyID = alert.id")
      .leftJoin("Dispatcher", "dispatcher", "dispatcher.id = rescueForm.dispatcherID")
      .leftJoin("PostRescueForm", "prf", "prf.alertID = alert.id")
      .where("rescueForm.id IS NOT NULL")
      .andWhere("rescueForm.status = :status", { status: "Dispatched" })
      .andWhere("prf.id IS NULL")
      .select([
        "alert.id AS \"alertId\"",
        "terminal.name AS \"terminalName\"",
        "rescueForm.originalAlertType AS \"alertType\"", // Use original alert type from rescue form
        "dispatcher.name AS \"dispatcherName\"",
        "rescueForm.status AS \"rescueStatus\"",
        "alert.dateTimeSent AS \"createdAt\"",
        "fp.address AS \"address\"",
        "n.id AS \"neighborhoodId\"",
        "fp.firstName AS \"focalFirstName\"",
        "fp.lastName AS \"focalLastName\"",
      ])
      .orderBy("alert.dateTimeSent", "ASC")
      .getRawMany();

    // Parse address and extract coordinates from each report
    const reportsWithCoordinates = pending.map(report => {
      let coordinates = "N/A";
      let houseAddress = "N/A";
      
      if (report.address) {
        try {
          const parsedAddress = JSON.parse(report.address);
          if (parsedAddress.coordinates) {
            coordinates = parsedAddress.coordinates;
          }
          if (parsedAddress.address) {
            houseAddress = parsedAddress.address;
          }
        } catch (e) {
          // If parsing fails, use the raw address
          houseAddress = report.address;
        }
      }
      
      return {
        ...report,
        address: houseAddress,
        coordinates: coordinates,
        focalPersonName: [report.focalFirstName, report.focalLastName].filter(Boolean).join(" ") || "N/A",
      };
    });

    // Update cache with fresh data (balanced TTL for responsiveness)
    await setCache(cacheKey, reportsWithCoordinates, 1); // 1 minute cache like terminals
    res.set('Cache-Control', 'public, max-age=1');
    res.json(reportsWithCoordinates);
});

// Aggregated
// All of the Data in Document
const getAggregatedRescueReports = catchAsync(async (req, res, next) => {
  const { alertID } = req.query || {};
    const bypassCache = req.query.refresh === 'true';
    const cacheKey = alertID ? `aggregatedReports:${alertID}` : `aggregatedReports:all`;
    
    // Check cache only if not bypassing
    if (!bypassCache) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    let qb = alertRepo
      .createQueryBuilder("alert")
      .leftJoin("RescueForm", "rf", "rf.emergencyID = alert.id")
      .leftJoin("FocalPerson", "fp", "fp.id = rf.focalPersonID")
      .leftJoin("Neighborhood", "n", "n.focalPersonID = fp.id")
      .leftJoin("PostRescueForm", "prf", "prf.alertID = alert.id");

    if (alertID) {
      qb = qb.where("alert.id = :alertID", { alertID })
             .andWhere("rf.status = :rfStatus", { rfStatus: "Completed" })
             .andWhere("prf.id IS NOT NULL");
    } else {
      // Only include those with a RescueForm that is Completed and have a PostRescueForm
      qb = qb.where("rf.status = :rfStatus", { rfStatus: "Completed" })
             .andWhere("prf.id IS NOT NULL")
             .andWhere("(prf.archived IS NULL OR prf.archived = :archived)", { archived: false });
    }

    const rows = await qb
      .select([
        "n.id AS \"neighborhoodId\"",
        "fp.firstName AS \"fpFirstName\"",
        "fp.lastName AS \"fpLastName\"",
        "fp.address AS \"fpAddress\"",
        "fp.contactNumber AS \"fpContactNumber\"",
        "alert.id AS \"alertId\"",
        "rf.emergencyID AS \"emergencyId\"",
        "rf.waterLevel AS \"waterLevel\"",
        "rf.urgencyOfEvacuation AS \"urgencyOfEvacuation\"",
        "rf.hazardPresent AS \"hazardPresent\"",
        "rf.accessibility AS \"accessibility\"",
        "rf.resourceNeeds AS \"resourceNeeds\"",
        "rf.otherInformation AS \"otherInformation\"",
        "rf.originalAlertType AS \"alertType\"", // Use original alert type from rescue form
        "prf.createdAt AS \"prfCreatedAt\"",
        "prf.completedAt AS \"prfCompletedAt\"",
        "prf.noOfPersonnelDeployed AS \"noOfPersonnel\"",
        "prf.resourcesUsed AS \"resourcesUsed\"",
        "prf.actionTaken AS \"actionsTaken\"",
      ])
      .orderBy("alert.dateTimeSent", "DESC")
      .getRawMany();

    const data = rows.map(r => {
      const timeOfRescue = r.prfCreatedAt || null;
      const completedAt = r.prfCompletedAt || null;
      const rescueCompleted = !!completedAt;

      let resourcesUsed = r.resourcesUsed;
      if (typeof resourcesUsed === 'string') {
          try {
              resourcesUsed = JSON.parse(resourcesUsed);
          } catch (e) {
              // keep as string if parse fails
          }
      }

      let rescueCompletionTime = null;
      if (timeOfRescue && completedAt) {
        const start = new Date(timeOfRescue).getTime();
        const end = new Date(completedAt).getTime();
        const diffMs = Math.max(0, end - start);
        // Format as HH:MM:SS
        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const hh = String(hours).padStart(2, "0");
        const mm = String(minutes).padStart(2, "0");
        const ss = String(seconds).padStart(2, "0");
        rescueCompletionTime = `${hh}:${mm}:${ss}`;
      }

      return {
        neighborhoodId: r.neighborhoodId || null,
        focalFirstName: r.fpFirstName || null,
        focalLastName: r.fpLastName || null,
        focalAddress: r.fpAddress || null,
        focalContactNumber: r.fpContactNumber || null,

        emergencyId: r.emergencyId || r.alertId || null,
        alertId: r.alertId || r.emergencyId || null,
        dateTimeOccurred: r.prfCreatedAt || null,
        waterLevel: r.waterLevel || null,
        urgencyOfEvacuation: r.urgencyOfEvacuation || null,
        hazardPresent: r.hazardPresent || null,
        accessibility: r.accessibility || null,
        resourceNeeds: r.resourceNeeds || null,
        otherInformation: r.otherInformation || null,
        timeOfRescue, // PostRescueForm.createdAt
        alertType: r.alertType || null,
        completionDate: completedAt,

        rescueCompleted,
        rescueCompletionTime, // human (e.g., "1h 12m")
        noOfPersonnel: r.noOfPersonnel || null,
        resourcesUsed: resourcesUsed || null,
        actionsTaken: r.actionsTaken || null,
      };
    });

    await setCache(cacheKey, data, 300);
    return res.json(data);
});

// Post Rescue Form
// Complete Table 
const getAggregatedPostRescueForm = catchAsync(async (req, res, next) => {
    const { alertID } = req.query || {};
    const cacheKey = alertID ? `aggregatedPRF:${alertID}` : `aggregatedPRF:all`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let qb = postRescueRepo
        .createQueryBuilder("prf")
        .leftJoin("prf.alerts", "alert")
        .leftJoin("rescueforms", "rf", "rf.emergencyID = alert.id")
        .leftJoin("focalpersons", "fp", "fp.id = rf.focalPersonID")
        .leftJoin("dispatchers", "dispatcher", "dispatcher.id = rf.dispatcherID")
        .where("prf.archived = :archived", { archived: false });

    if (alertID) {
        qb = qb.andWhere("prf.alertID = :alertID", { alertID });
    }

    const rows = await qb
        .select([
            "rf.emergencyID AS \"emergencyId\"",
            "alert.terminalID AS \"terminalId\"",
            "fp.firstName AS \"focalFirstName\"",
            "fp.lastName AS \"focalLastName\"",
            "alert.dateTimeSent AS \"dateTimeOccurred\"",
            "rf.originalAlertType AS \"alertType\"", // Use original alert type from rescue form
            "fp.address AS \"houseAddress\"",
            "dispatcher.name AS \"dispatchedName\"",
            "prf.completedAt AS \"completionDate\"",
        ])
        .orderBy("prf.completedAt", "DESC")
        .getRawMany();

    await setCache(cacheKey, rows, 300);
    return res.json(rows);
});

// Clear Cache Endpoint
const clearReportsCache = catchAsync(async (req, res, next) => {
    await deleteCache("completedReports");
    await deleteCache("pendingReports");
    await deleteCache("rescueForms:all");
    
    // Clear all aggregated cache keys that might exist
    const keys = [
        "aggregatedReports:all",
        "aggregatedPRF:all"
    ];
    
    for (const key of keys) {
        await deleteCache(key);
    }
    
    res.json({ message: "Reports cache cleared successfully" });
});

// Fix Data: Update RescueForm status to "Completed" for alerts with PostRescueForm records
const fixRescueFormStatus = catchAsync(async (req, res, next) => {
    console.log('[FixData] Starting rescue form status fix...');
    
    // Get all PostRescueForm records
    const postRescueForms = await postRescueRepo.find({
        select: ["alertID"]
    });
    
    if (postRescueForms.length === 0) {
        return res.json({ message: "No PostRescueForm records found", fixed: 0 });
    }
    
    const alertIds = postRescueForms.map(prf => prf.alertID);
    console.log('[FixData] Found PostRescueForm records for alerts:', alertIds);
    
    // Find RescueForm records for these alerts that don't have status "Completed"
    const rescueFormsToUpdate = await rescueFormRepo
        .createQueryBuilder("rescueForm")
        .where("rescueForm.emergencyID IN (:...alertIds)", { alertIds })
        .andWhere("rescueForm.status != :status", { status: "Completed" })
        .getMany();
        
    console.log('[FixData] Found rescue forms to update:', rescueFormsToUpdate.map(rf => ({ id: rf.id, emergencyID: rf.emergencyID, currentStatus: rf.status })));
    
    // Update the status to "Completed"
    let updatedCount = 0;
    for (const rescueForm of rescueFormsToUpdate) {
        rescueForm.status = "Completed";
        await rescueFormRepo.save(rescueForm);
        updatedCount++;
        console.log(`[FixData] Updated RescueForm ${rescueForm.id} status to "Completed"`);
    }
    
    // Clear cache after fixing data
    await deleteCache("completedReports");
    await deleteCache("pendingReports");
    
    res.json({ 
        message: `Fixed ${updatedCount} rescue form statuses`,
        fixed: updatedCount,
        alertIds: alertIds
    });
});

// Migration Helper: Update existing rescue forms with original alert types
const migrateOriginalAlertTypes = catchAsync(async (req, res, next) => {
    const rescueForms = await rescueFormRepo
        .createQueryBuilder("rf")
        .leftJoin("Alert", "alert", "alert.id = rf.emergencyID")
        .where("rf.originalAlertType IS NULL")
        .andWhere("alert.alertType IS NOT NULL")
        .select([
            "rf.id AS rescueFormId",
            "rf.emergencyID AS alertId", 
            "alert.alertType AS currentAlertType"
        ])
        .getRawMany();

    let updatedCount = 0;
    for (const form of rescueForms) {
        await rescueFormRepo.update(
            { id: form.rescueFormId },
            { originalAlertType: form.currentAlertType }
        );
        updatedCount++;
    }

    res.json({ 
        message: `Migration completed: ${updatedCount} rescue forms updated with original alert types`,
        updatedCount 
    });
});

// GET Alert Type Chart Data
const getAlertTypeChartData = catchAsync(async (req, res, next) => {
    const { timeRange = 'last3months' } = req.query;
    const cacheKey = `alertTypeChart:${timeRange}`;
    
    console.log(`[AlertTypeChart] Processing request for timeRange: ${timeRange}`);

    // Calculate date range based on timeRange parameter
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
        case 'last6months':
            startDate.setMonth(endDate.getMonth() - 6);
            break;
        case 'lastyear':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        case 'last3months':
        default:
            startDate.setDate(endDate.getDate() - 30);
            break;
    }

    console.log(`[AlertTypeChart] Querying data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // First, let's check if there are any rescue forms at all
    const totalRescueForms = await rescueFormRepo.count();
    console.log(`[AlertTypeChart] Total rescue forms in database: ${totalRescueForms}`);

    // Check rescue forms with alerts in any date range
    const totalWithAlerts = await rescueFormRepo
        .createQueryBuilder("rf")
        .leftJoin("rf.alert", "alert")
        .where("alert.dateTimeSent IS NOT NULL")
        .getCount();
    console.log(`[AlertTypeChart] Total rescue forms with alerts: ${totalWithAlerts}`);

    // Query rescue forms with alert data - focus on originalAlertType from rescueforms table
    const alertData = await rescueFormRepo
        .createQueryBuilder("rf")
        .leftJoin("rf.alert", "alert")
        .where("alert.dateTimeSent >= :startDate", { startDate })
        .andWhere("alert.dateTimeSent <= :endDate", { endDate })
        .andWhere("rf.originalAlertType IS NOT NULL") // Only get records with alert types
        .select([
            "rf.originalAlertType AS alertType",
            "alert.dateTimeSent AS alertDate"
        ])
        .getRawMany();

    console.log(`[AlertTypeChart] Found ${alertData.length} rescue forms with alert types in date range`);

    // Log sample data to understand the alert types
    if (alertData.length > 0) {
        const sampleTypes = [...new Set(alertData.map(item => item.alertType))];
        console.log(`[AlertTypeChart] Sample alert types found:`, sampleTypes);
    }

    // Generate chart data based on time range
    const chartData = [];
        
        if (timeRange === 'last3months') {
            // For last 30 days, show weekly data points including today
            const weeks = 5; // Show 5 weeks to include today
            for (let i = 0; i < weeks; i++) {
                const weekStart = new Date(startDate);
                weekStart.setDate(startDate.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                // For the last week, make sure it includes today
                if (i === weeks - 1) {
                    weekEnd.setTime(endDate.getTime());
                }
                
                const weekLabel = i === weeks - 1 ? 
                    `Today (${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` :
                    weekStart.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    });

                // Count alerts in this week
                let userInitiated = 0;
                let critical = 0;

                alertData.forEach(item => {
                    const alertDate = new Date(item.alertDate);
                    if (alertDate >= weekStart && alertDate <= weekEnd) {
                        const alertType = (item.alertType || '').toLowerCase();
                        console.log(`[AlertTypeChart] Processing alert type: "${item.alertType}" on ${alertDate.toDateString()}`);
                        
                        if (alertType.includes('user') || alertType === 'user-initiated') {
                            userInitiated++;
                        } else if (alertType.includes('critical') || alertType === 'critical') {
                            critical++;
                        }
                        // Note: If alertType doesn't match either category, it won't be counted
                    }
                });

                console.log(`[AlertTypeChart] Week ${weekLabel}: userInitiated=${userInitiated}, critical=${critical}`);

                chartData.push({
                    date: weekLabel,
                    userInitiated,
                    critical
                });
            }
        } else if (timeRange === 'last6months') {
            // For 6 months, show monthly data points including current month
            for (let i = 0; i < 6; i++) {
                const monthStart = new Date(startDate);
                monthStart.setMonth(startDate.getMonth() + i);
                monthStart.setDate(1);
                
                const monthEnd = new Date(monthStart);
                monthEnd.setMonth(monthStart.getMonth() + 1);
                monthEnd.setDate(0);
                
                // For the last month, make sure it includes today
                if (i === 5) {
                    monthEnd.setTime(endDate.getTime());
                }

                const monthLabel = i === 5 ?
                    `${monthStart.toLocaleDateString('en-US', { month: 'short' })} (Current)` :
                    monthStart.toLocaleDateString('en-US', { 
                        month: 'short' 
                    });

                // Count alerts in this month
                let userInitiated = 0;
                let critical = 0;

                alertData.forEach(item => {
                    const alertDate = new Date(item.alertDate);
                    if (alertDate >= monthStart && alertDate <= monthEnd) {
                        const alertType = (item.alertType || '').toLowerCase();
                        
                        if (alertType.includes('user') || alertType === 'user-initiated') {
                            userInitiated++;
                        } else if (alertType.includes('critical') || alertType === 'critical') {
                            critical++;
                        }
                    }
                });

                chartData.push({
                    date: monthLabel,
                    userInitiated,
                    critical
                });
            }
        } else if (timeRange === 'lastyear') {
            // For last year, show quarterly data points including current quarter
            const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
            const currentYear = endDate.getFullYear();
            
            for (let i = 0; i < 4; i++) {
                const quarterStart = new Date(startDate);
                quarterStart.setMonth(i * 3);
                quarterStart.setDate(1);
                
                const quarterEnd = new Date(quarterStart);
                quarterEnd.setMonth(quarterStart.getMonth() + 3);
                quarterEnd.setDate(0);
                
                // For the current quarter, make sure it includes today
                const currentQuarter = Math.floor(endDate.getMonth() / 3);
                if (i === currentQuarter) {
                    quarterEnd.setTime(endDate.getTime());
                }

                const quarterLabel = i === currentQuarter ?
                    `${quarters[i]} ${currentYear} (Current)` :
                    `${quarters[i]} ${quarterStart.getFullYear()}`;

                // Count alerts in this quarter
                let userInitiated = 0;
                let critical = 0;

                alertData.forEach(item => {
                    const alertDate = new Date(item.alertDate);
                    if (alertDate >= quarterStart && alertDate <= quarterEnd) {
                        const alertType = (item.alertType || '').toLowerCase();
                        
                        if (alertType.includes('user') || alertType === 'user-initiated') {
                            userInitiated++;
                        } else if (alertType.includes('critical') || alertType === 'critical') {
                            critical++;
                        }
                    }
                });

                chartData.push({
                    date: quarterLabel,
                    userInitiated,
                    critical
                });
            }
        }

    console.log(`[AlertTypeChart] Generated chart data:`, chartData);

    // Cache for 30 minutes
    await setCache(cacheKey, chartData, 1800);
    res.json(chartData);
});

// GET Detailed Report Data for PDF Generation
const getDetailedReportData = catchAsync(async (req, res, next) => {
    const { alertId } = req.params;
    
    console.log('[DetailedReport] Fetching data for alertId:', alertId);
    console.log('[DetailedReport] AlertId type:', typeof alertId);
    
    if (!alertId || alertId === 'undefined' || alertId === 'null') {
        return next(new BadRequestError("Alert ID is required"));
    }

    // First, let's check if the alert exists
    const alertExists = await alertRepo.findOne({ where: { id: alertId } });
    console.log('[DetailedReport] Alert exists:', !!alertExists);
    console.log('[DetailedReport] Alert data:', alertExists);
    
    if (!alertExists) {
        console.log('[DetailedReport] Alert not found in database for ID:', alertId);
        return next(new NotFoundError(`Alert not found for ID: ${alertId}`));
    }

    // Get detailed report data using complex join query
    console.log('[DetailedReport] Building query for alertId:', alertId);
    const reportData = await alertRepo
            .createQueryBuilder("alert")
            .leftJoin("alert.terminal", "terminal")
            .leftJoin("Neighborhood", "n", "n.terminalID = terminal.id")
            .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
            .leftJoin("RescueForm", "rf", "rf.emergencyID = alert.id")
            .leftJoin("Dispatcher", "dispatcher", "dispatcher.id = rf.dispatcherID")
            .leftJoin("PostRescueForm", "prf", "prf.alertID = alert.id")
            .where("alert.id = :alertId", { alertId })
            .select([
                // Alert information
                "alert.id AS alertId",
                "alert.alertType AS originalAlertType",
                "alert.dateTimeSent AS dateTimeSent",
                
                // Terminal information
                "terminal.name AS terminalName",
                
                // Neighborhood information
                "n.id AS neighborhoodId",
                
                // Focal Person information
                "fp.firstName AS focalFirstName",
                "fp.lastName AS focalLastName",
                "fp.address AS focalAddress",
                "fp.contactNumber AS focalContactNumber",
                
                // Rescue Form information
                "rf.id AS rescueFormId",
                "rf.waterLevel AS waterLevel",
                "rf.urgencyOfEvacuation AS urgencyOfEvacuation",
                "rf.hazardPresent AS hazardPresent",
                "rf.accessibility AS accessibility",
                "rf.resourceNeeds AS resourceNeeds",
                "rf.otherInformation AS otherInformation",
                "rf.originalAlertType AS rescueFormAlertType",
                
                // Dispatcher information
                "dispatcher.name AS dispatcherName",
                
                // Post Rescue Form information
                "prf.id AS postRescueFormId",
                "prf.noOfPersonnelDeployed AS noOfPersonnelDeployed",
                "prf.resourcesUsed AS resourcesUsed",
                "prf.actionTaken AS actionTaken",
                "prf.completedAt AS completedAt",
                "prf.createdAt AS prfCreatedAt"
            ])
            .getRawOne();

    console.log('[DetailedReport] Query result:', reportData);
    console.log('[DetailedReport] Query result keys:', reportData ? Object.keys(reportData) : 'null');
    console.log('[DetailedReport] Has rescue form:', !!reportData?.rescueformid);
    console.log('[DetailedReport] Has post rescue form:', !!reportData?.postrescueformid);

    if (!reportData) {
        console.log('[DetailedReport] No data found for alertId:', alertId);
        return next(new NotFoundError(`Report data not found for Alert ID: ${alertId}`));
    }

    // PostgreSQL returns lowercase column names, so access them accordingly
    let resourcesUsed = reportData.resourcesused;
    if (typeof resourcesUsed === 'string') {
        try {
            resourcesUsed = JSON.parse(resourcesUsed);
        } catch (e) {
            // keep as string
        }
    }

    // Format the response data (accessing lowercase property names from PostgreSQL)
    const formattedData = {
            alertId: reportData.alertid,
            emergencyId: reportData.alertid, // Using alertId as emergencyId for compatibility
            
            // Community & Terminal Information
            neighborhoodId: reportData.neighborhoodid || 'N/A',
            terminalName: reportData.terminalname || 'N/A',
            focalPersonName: `${reportData.focalfirstname || ''} ${reportData.focallastname || ''}`.trim() || 'N/A',
            focalPersonAddress: (() => {
                // Parse the JSON address and extract just the address field
                try {
                    if (reportData.focaladdress && typeof reportData.focaladdress === 'string') {
                        const parsed = JSON.parse(reportData.focaladdress);
                        return parsed.address || reportData.focaladdress;
                    }
                    return reportData.focaladdress || 'N/A';
                } catch (e) {
                    // If parsing fails, return the original string
                    return reportData.focaladdress || 'N/A';
                }
            })(),
            focalPersonContactNumber: reportData.focalcontactnumber || 'N/A',
            
            // Emergency Context
            waterLevel: reportData.waterlevel || 'N/A',
            urgencyOfEvacuation: reportData.urgencyofevacuation || 'N/A',
            hazardPresent: reportData.hazardpresent || 'N/A',
            accessibility: reportData.accessibility || 'N/A',
            resourceNeeds: reportData.resourceneeds || 'N/A',
            otherInformation: reportData.otherinformation || 'N/A',
            alertType: reportData.rescueformalerttype || reportData.originalalerttype || 'N/A',
            timeOfRescue: reportData.prfcreatedat ? new Date(reportData.prfcreatedat).toLocaleTimeString() : 'N/A',
            dateTimeOccurred: reportData.datetimesent ? new Date(reportData.datetimesent).toLocaleString() : 'N/A',
            
            // Dispatcher Information
            dispatcherName: reportData.dispatchername || 'N/A',
            
            // Rescue Completion Details
            rescueFormId: reportData.rescueformid || 'N/A',
            postRescueFormId: reportData.postrescueformid || 'N/A',
            noOfPersonnelDeployed: reportData.noofpersonneldeployed || 'N/A',
            resourcesUsed: resourcesUsed || 'N/A',
            actionTaken: reportData.actiontaken || 'N/A',
            completedAt: reportData.completedat ? new Date(reportData.completedat).toLocaleString() : 'N/A',
        rescueCompletionTime: reportData.completedat ? new Date(reportData.completedat).toLocaleTimeString() : 'N/A'
    };

    console.log('[DetailedReport] Formatted response:', formattedData);
    return res.json(formattedData);
});

// ARCHIVE POST RESCUE FORM
const archivePostRescueForm = catchAsync(async (req, res, next) => {
    const { alertID } = req.params;

    const form = await postRescueRepo.findOne({ where: { alertID } });
    if (!form) {
        return next(new NotFoundError("Post Rescue Form Not Found"));
    }

    form.archived = true;
    await postRescueRepo.save(form);

    // Cache invalidation
    await deleteCache("completedReports");
    await deleteCache("pendingReports");
    await deleteCache("rescueForms:all");
    await deleteCache(`rescueForm:${form.id}`);
    await deleteCache(`alert:${alertID}`);
    await deleteCache("aggregatedReports:all");
    await deleteCache("aggregatedPRF:all");
    await deleteCache(`rescueAggregatesBasic:all`);
    await deleteCache(`rescueAggregatesBasic:${alertID}`);
    await deleteCache(`aggregatedReports:${alertID}`);
    await deleteCache(`aggregatedPRF:${alertID}`);
    await deleteCache("archivedPRF:all");
    await deleteCache(`archivedPRF:${alertID}`);
    await deleteCache("adminDashboardStats");

    return res.json({ message: "Post Rescue Form Archived Successfully" });
});

// RESTORE POST RESCUE FORM
const restorePostRescueForm = catchAsync(async (req, res, next) => {
    const { alertID } = req.params;

    const form = await postRescueRepo.findOne({ where: { alertID } });
    if (!form) {
        return next(new NotFoundError("Post Rescue Form Not Found"));
    }

    form.archived = false;
    await postRescueRepo.save(form);

    // Cache invalidation
    await deleteCache("completedReports");
    await deleteCache("pendingReports");
    await deleteCache("rescueForms:all");
    await deleteCache(`rescueForm:${form.id}`);
    await deleteCache(`alert:${alertID}`);
    await deleteCache("aggregatedReports:all");
    await deleteCache("aggregatedPRF:all");
    await deleteCache(`rescueAggregatesBasic:all`);
    await deleteCache(`rescueAggregatesBasic:${alertID}`);
    await deleteCache(`aggregatedReports:${alertID}`);
    await deleteCache(`aggregatedPRF:${alertID}`);
    await deleteCache("archivedPRF:all");
    await deleteCache(`archivedPRF:${alertID}`);

    return res.json({ message: "Post Rescue Form Restored Successfully" });
});

// GET Archived Post Rescue Forms
const getArchivedPostRescueForm = catchAsync(async (req, res, next) => {
    const { alertID } = req.query || {};
    const cacheKey = alertID ? `archivedPRF:${alertID}` : `archivedPRF:all`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let qb = alertRepo
        .createQueryBuilder("alert")
        .leftJoin("alert.terminal", "terminal")
        .leftJoin("Neighborhood", "n", "n.terminalID = terminal.id")
        .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
        .leftJoin("RescueForm", "rescueForm", "rescueForm.emergencyID = alert.id")
        .leftJoin("Dispatcher", "dispatcher", "dispatcher.id = rescueForm.dispatcherID")
        .leftJoin("PostRescueForm", "prf", "prf.alertID = alert.id")
        .where("prf.archived = :archived", { archived: true });

    if (alertID) {
        qb = qb.andWhere("alert.id = :alertID", { alertID });
    }

    const rows = await qb
        .select([
            "rescueForm.emergencyID AS \"emergencyId\"",
            "terminal.name AS \"terminalName\"",
            "alert.terminalID AS \"terminalId\"",
            "fp.firstName AS \"focalFirstName\"",
            "fp.lastName AS \"focalLastName\"",
            "alert.dateTimeSent AS \"dateTimeOccurred\"",
            "rescueForm.originalAlertType AS \"alertType\"",
            "fp.address AS \"houseAddress\"",
            "dispatcher.name AS \"dispatchedName\"",
            "prf.completedAt AS \"completionDate\"",
        ])
        .orderBy("prf.completedAt", "DESC")
        .getRawMany();

    await setCache(cacheKey, rows, 300);
    return res.json(rows);
});

// DELETE Post Rescue Form Permanently
const deletePostRescueForm = catchAsync(async (req, res, next) => {
    const { alertID } = req.params;

    const form = await postRescueRepo.findOne({ where: { alertID } });
    if (!form) {
        return next(new NotFoundError("Post Rescue Form Not Found"));
    }

    // Permanently delete the post rescue form
    await postRescueRepo.remove(form);

    // Cache invalidation
    await deleteCache("completedReports");
    await deleteCache("pendingReports");
    await deleteCache("rescueForms:all");
    await deleteCache(`rescueForm:${form.id}`);
    await deleteCache(`alert:${alertID}`);
    await deleteCache("aggregatedReports:all");
    await deleteCache("aggregatedPRF:all");
    await deleteCache(`rescueAggregatesBasic:all`);
    await deleteCache(`rescueAggregatesBasic:${alertID}`);
    await deleteCache(`aggregatedReports:${alertID}`);
    await deleteCache(`aggregatedPRF:${alertID}`);
    await deleteCache("archivedPRF:all");
    await deleteCache(`archivedPRF:${alertID}`);

    return res.json({ message: "Post Rescue Form Deleted Permanently" });
});

module.exports = {
  createPostRescueForm,
  getCompletedReports,
  getPendingReports,
  getAggregatedPostRescueForm,
  getAggregatedRescueReports,
  clearReportsCache,
  migrateOriginalAlertTypes,
  fixRescueFormStatus,
  getAlertTypeChartData,
  getDetailedReportData,
  archivePostRescueForm,
  restorePostRescueForm,
  getArchivedPostRescueForm,
  deletePostRescueForm,
};