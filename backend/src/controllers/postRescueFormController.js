const { AppDataSource } = require("../config/dataSource");
const alertRepo = AppDataSource.getRepository("Alert");
const postRescueRepo = AppDataSource.getRepository("PostRescueForm");
const rescueFormRepo = AppDataSource.getRepository("RescueForm");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const communityGroupRepo = AppDataSource.getRepository("CommunityGroup");
const {
  getCache,
  setCache,
  deleteCache
} = require("../config/cache");

// CREATE POST RESCUE FORM
const createPostRescueForm = async (req, res) => {
    try {
        const {alertID} = req.params;
        const { noOfPersonnelDeployed, resourcesUsed, actionTaken} = req.body;

        // Check if the Alert Exist
        const alert = await alertRepo.findOne({where: {id: alertID} });
        if (!alert) return res.status(404).json({message: "Alert Not Found"});

        // Only Allowed if the Alert is "Dispatched"
        if (alert.status !== "Dispatched") {
            return res.status(400).json({message: "Please Dispatched a Rescue Team First"});
        }

        const rescueForm = await rescueFormRepo.findOne({ where: {emergencyID: alertID} });
        if (!rescueForm) {
            return res.status(400).json({message: "Rescue Form Not Found"});
        }
            
        // Prevent Duplication
        const existing = await postRescueRepo.findOne({where: {alertID} });
        if (existing) return res.status(400).json({message: "Post Rescue Form Already Exists"});

        // Create the Post Rescue Form
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

        return res.status(201).json({message: "Post Rescue Form Created", newForm});
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Server Error"});
    }
};

// GET Completed Reports
const getCompletedReports = async (req, res) => {
  try {
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
      .select([
        "alert.id AS alertId",
        "terminal.name AS terminalName",
        "rescueForm.originalAlertType AS alertType", // Use original alert type from rescue form
        "dispatcher.name AS dispatcherName",
        "rescueForm.status AS rescueStatus",
        "alert.dateTimeSent AS createdAt",
        "prf.completedAt AS completedAt",
        "fp.address AS address",
      ])
      .orderBy("alert.dateTimeSent", "ASC")
      .getRawMany();

    // Update cache with fresh data (shorter TTL for faster refresh after new reports)
    await setCache(cacheKey, reports, 30);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

const getPendingReports = async (req, res) => {
  try {
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
        "alert.id AS alertId",
        "terminal.name AS terminalName",
        "rescueForm.originalAlertType AS alertType", // Use original alert type from rescue form
        "dispatcher.name AS dispatcherName",
        "rescueForm.status AS rescueStatus",
        "alert.dateTimeSent AS createdAt",
        "fp.address AS address",
      ])
      .orderBy("alert.dateTimeSent", "ASC")
      .getRawMany();

    // Update cache with fresh data (balanced TTL for responsiveness)
    await setCache(cacheKey, pending, 1); // 1 minute cache like terminals
    res.set('Cache-Control', 'public, max-age=1');
    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Aggregated
// All of the Data in Document
const getAggregatedRescueReports = async (req, res) => {
  try {
    const { alertID } = req.query || {};
    const cacheKey = alertID ? `aggregatedReports:${alertID}` : `aggregatedReports:all`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let qb = alertRepo
      .createQueryBuilder("alert")
      .leftJoin("RescueForm", "rf", "rf.emergencyID = alert.id")
      .leftJoin("FocalPerson", "fp", "fp.id = rf.focalPersonID")
      .leftJoin("Neighborhood", "n", "n.focalPersonID = fp.id")
      .leftJoin("PostRescueForm", "prf", "prf.alertID = alert.id");

    if (alertID) {
      qb = qb.where("alert.id = :alertID", { alertID })
             .andWhere("rf.status = :rfStatus", { rfStatus: "Dispatched" });
    } else {
      // Only include those with a RescueForm that is Dispatched
      qb = qb.where("rf.status = :rfStatus", { rfStatus: "Dispatched" });
    }

    const rows = await qb
      .select([
        "n.id AS neighborhoodId",
        "fp.firstName AS fpFirstName",
        "fp.lastName AS fpLastName",
        "fp.address AS fpAddress",
        "fp.contactNumber AS fpContactNumber",
        "alert.id AS alertId",
        "rf.emergencyID AS emergencyId",
        "rf.waterLevel AS waterLevel",
        "rf.urgencyOfEvacuation AS urgencyOfEvacuation",
        "rf.hazardPresent AS hazardPresent",
        "rf.accessibility AS accessibility",
        "rf.resourceNeeds AS resourceNeeds",
        "rf.otherInformation AS otherInformation",
        "rf.originalAlertType AS alertType", // Use original alert type from rescue form
        "prf.createdAt AS prfCreatedAt",
        "prf.completedAt AS prfCompletedAt",
        "prf.noOfPersonnelDeployed AS noOfPersonnel",
        "prf.resourcesUsed AS resourcesUsed",
        "prf.actionTaken AS actionsTaken",
      ])
      .orderBy("alert.dateTimeSent", "DESC")
      .getRawMany();

    const data = rows.map(r => {
      const timeOfRescue = r.prfCreatedAt || null;
      const completedAt = r.prfCompletedAt || null;
      const rescueCompleted = !!completedAt;

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
        focalPersonName: [r.fpFirstName, r.fpLastName].filter(Boolean).join(" ") || null,
        focalPersonAddress: r.fpAddress || null,
        focalPersonContactNumber: r.fpContactNumber || null,

        emergencyId: r.emergencyId || r.alertId || null,
        waterLevel: r.waterLevel || null,
        urgencyOfEvacuation: r.urgencyOfEvacuation || null,
        hazardPresent: r.hazardPresent || null,
        accessibility: r.accessibility || null,
        resourceNeeds: r.resourceNeeds || null,
        otherInformation: r.otherInformation || null,
        timeOfRescue, // PostRescueForm.createdAt
        alertType: r.alertType || null,

        rescueCompleted,
        rescueCompletionTime, // human (e.g., "1h 12m")
        noOfPersonnel: r.noOfPersonnel || null,
        resourcesUsed: r.resourcesUsed || null,
        actionsTaken: r.actionsTaken || null,
      };
    });

    await setCache(cacheKey, data, 300);
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Post Rescue Form
// Complete Table 
const getAggregatedPostRescueForm = async (req, res) => {
    try {
        const { alertID } = req.query || {};
        const cacheKey = alertID ? `aggregatedPRF:${alertID}` : `aggregatedPRF:all`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        let qb = postRescueRepo
            .createQueryBuilder("prf")
            .leftJoin("prf.alerts", "alert")
            .leftJoin("rescueforms", "rf", "rf.emergencyID = alert.id")
            .leftJoin("focalpersons", "fp", "fp.id = rf.focalPersonID")
            .leftJoin("dispatchers", "dispatcher", "dispatcher.id = rf.dispatcherID");

        if (alertID) {
            qb = qb.where("prf.alertID = :alertID", { alertID });
        }

        const rows = await qb
            .select([
                "rf.emergencyID AS emergencyId",
                "alert.terminalID AS terminalId",
                "fp.firstName AS focalFirstName",
                "fp.lastName AS focalLastName",
                "alert.dateTimeSent AS dateTimeOccurred",
                "rf.originalAlertType AS alertType", // Use original alert type from rescue form
                "fp.address AS houseAddress",
                "dispatcher.name AS dispatchedName",
                "prf.completedAt AS completionDate",
            ])
            .orderBy("prf.completedAt", "DESC")
            .getRawMany();

        await setCache(cacheKey, rows, 300);
        return res.json(rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server Error" });
    }
};

// Clear Cache Endpoint
const clearReportsCache = async (req, res) => {
    try {
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// Fix Data: Update RescueForm status to "Completed" for alerts with PostRescueForm records
const fixRescueFormStatus = async (req, res) => {
    try {
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
    } catch (err) {
        console.error('[FixData] Error:', err);
        res.status(500).json({ message: "Server Error" });
    }
};

// Migration Helper: Update existing rescue forms with original alert types
const migrateOriginalAlertTypes = async (req, res) => {
    try {
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
    } catch (err) {
        console.error('Migration error:', err);
        res.status(500).json({ message: "Migration Error" });
    }
};

// GET Alert Type Chart Data
const getAlertTypeChartData = async (req, res) => {
    try {
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
    } catch (err) {
        console.error('[AlertTypeChart] Error:', err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// GET Detailed Report Data for PDF Generation
const getDetailedReportData = async (req, res) => {
    try {
        const { alertId } = req.params;
        
        console.log('[DetailedReport] Fetching data for alertId:', alertId);
        
        if (!alertId) {
            return res.status(400).json({ message: "Alert ID is required" });
        }

        // First, let's check if the alert exists
        const alertExists = await alertRepo.findOne({ where: { id: alertId } });
        console.log('[DetailedReport] Alert exists:', !!alertExists);
        
        if (!alertExists) {
            return res.status(404).json({ message: "Alert not found" });
        }

        // Get detailed report data using complex join query
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

        if (!reportData) {
            console.log('[DetailedReport] No data found for alertId:', alertId);
            return res.status(404).json({ message: "Report data not found for the given Alert ID" });
        }

        // Format the response data
        const formattedData = {
            alertId: reportData.alertId,
            emergencyId: reportData.alertId, // Using alertId as emergencyId for compatibility
            
            // Community & Terminal Information
            neighborhoodId: reportData.neighborhoodId || 'N/A',
            terminalName: reportData.terminalName || 'N/A',
            focalPersonName: `${reportData.focalFirstName || ''} ${reportData.focalLastName || ''}`.trim() || 'N/A',
            focalPersonAddress: (() => {
                // Parse the JSON address and extract just the address field
                try {
                    if (reportData.focalAddress && typeof reportData.focalAddress === 'string') {
                        const parsed = JSON.parse(reportData.focalAddress);
                        return parsed.address || reportData.focalAddress;
                    }
                    return reportData.focalAddress || 'N/A';
                } catch (e) {
                    // If parsing fails, return the original string
                    return reportData.focalAddress || 'N/A';
                }
            })(),
            focalPersonContactNumber: reportData.focalContactNumber || 'N/A',
            
            // Emergency Context
            waterLevel: reportData.waterLevel || 'N/A',
            urgencyOfEvacuation: reportData.urgencyOfEvacuation || 'N/A',
            hazardPresent: reportData.hazardPresent || 'N/A',
            accessibility: reportData.accessibility || 'N/A',
            resourceNeeds: reportData.resourceNeeds || 'N/A',
            otherInformation: reportData.otherInformation || 'N/A',
            alertType: reportData.rescueFormAlertType || reportData.originalAlertType || 'N/A',
            timeOfRescue: reportData.prfCreatedAt ? new Date(reportData.prfCreatedAt).toLocaleTimeString() : 'N/A',
            dateTimeOccurred: reportData.dateTimeSent ? new Date(reportData.dateTimeSent).toLocaleString() : 'N/A',
            
            // Dispatcher Information
            dispatcherName: reportData.dispatcherName || 'N/A',
            
            // Rescue Completion Details
            rescueFormId: reportData.rescueFormId || 'N/A',
            postRescueFormId: reportData.postRescueFormId || 'N/A',
            noOfPersonnelDeployed: reportData.noOfPersonnelDeployed || 'N/A',
            resourcesUsed: reportData.resourcesUsed || 'N/A',
            actionTaken: reportData.actionTaken || 'N/A',
            completedAt: reportData.completedAt ? new Date(reportData.completedAt).toLocaleString() : 'N/A',
            rescueCompletionTime: reportData.completedAt ? new Date(reportData.completedAt).toLocaleTimeString() : 'N/A'
        };

        console.log('[DetailedReport] Formatted response:', formattedData);
        return res.json(formattedData);
        
    } catch (err) {
        console.error("[DetailedReport] Error fetching detailed report data:", err);
        return res.status(500).json({ message: "Server Error", error: err.message });
    }
};

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
};