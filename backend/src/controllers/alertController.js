const { AppDataSource } = require("../config/dataSource");
const { BadRequestError, NotFoundError } = require("../exceptions");
const catchAsync = require("../utils/catchAsync");
const alertRepo = AppDataSource.getRepository("Alert");
const terminalRepo = AppDataSource.getRepository("Terminal");
const rescueFormRepo = AppDataSource.getRepository("RescueForm");
const { sendDownlink } = require("../lms/downlink");
const { getIO } = require("../realtime/socket");
const {
	getCache,
	setCache,
    deleteCache
} = require("../config/cache");


// Helper: generate incremental Alert ID like ALRT001
async function generateAlertId() {
	const last = await alertRepo
		.createQueryBuilder("alert")
		.orderBy("alert.id", "DESC")
		.getOne();
	let newNumber = 1;
	if (last) {
		const match = String(last.id).match(/(\d+)$/);
		if (match) newNumber = parseInt(match[1], 10) + 1;
	}
	return "ALRT" + String(newNumber).padStart(3, "0");
}

// Create Critical Alert (sensor-triggered)
const createCriticalAlert = catchAsync(async (req, res, next) => {
	const { terminalID, alertType, sentThrough } = req.body;
	if (!terminalID) return next(new BadRequestError("terminalID is required"));

	const terminal = await terminalRepo.findOne({ where: { id: terminalID } });
	if (!terminal) return next(new NotFoundError("Terminal Not Found"));

	const id = await generateAlertId();
	const alert = alertRepo.create({
		id,
		terminalID,
		alertType: alertType || "Critical",
		sentThrough: sentThrough || "Sensor",
		status: "Unassigned",
		terminal: { id: terminalID },
	});

	await alertRepo.save(alert);
	await deleteCache("adminDashboardStats");
	await deleteCache("adminDashboard:aggregatedMap");
	res.status(201).json({ message: "Critical alert created", alert });
});

// Create User-Initiated Alert (button press)
const createUserInitiatedAlert = catchAsync(async (req, res, next) => {
	const { terminalID, alertType, sentThrough } = req.body;
	if (!terminalID) return next(new BadRequestError("terminalID is required"));

	const terminal = await terminalRepo.findOne({ where: { id: terminalID } });
	if (!terminal) return next(new NotFoundError("Terminal Not Found"));

	const id = await generateAlertId();
	const alert = alertRepo.create({
		id,
		terminalID,
		alertType: alertType || "User-Initiated",
		sentThrough: sentThrough || "Button",
		status: "Unassigned",
		terminal: { id: terminalID },
	});

	await alertRepo.save(alert);
	await deleteCache("adminDashboardStats");
	await deleteCache("adminDashboard:aggregatedMap");
	res.status(201).json({ message: "User-initiated alert created", alert });
});

  // Map View 
const getMapAlert = catchAsync(async (req, res, next) => {
  const cacheKey = "mapAlerts:latestPerTerminal";
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  
  const latestSQ = alertRepo
    .createQueryBuilder("a")
    .select("a.terminalID", "terminal_id")
    .addSelect("MAX(a.dateTimeSent)", "last_time")
    .groupBy("a.terminalID");

  const rows = await alertRepo
    .createQueryBuilder("alert")
    .innerJoin(
      "(" + latestSQ.getQuery() + ")",
      "last",
      "last.terminal_id = alert.terminalID AND last.last_time = alert.dateTimeSent"
    )
    .setParameters(latestSQ.getParameters())
    .leftJoin("Terminal", "t", "t.id = alert.terminalID")
    .leftJoin("Neighborhood", "n", "n.terminalID = alert.terminalID")
    .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
    .select([
      "t.name AS terminalName",
      "alert.alertType AS alertType",
      "t.status AS terminalStatus",
      "alert.dateTimeSent AS timeSent",
      "fp.firstName AS focalFirstName",
      "fp.lastName AS focalLastName",
      "fp.address AS focalAddress",
      "fp.contactNumber AS focalContactNumber",
    ])
    .orderBy("alert.dateTimeSent", "DESC")
    .getRawMany();

  await setCache(cacheKey, rows, 10);
  return res.json(rows);
});

// Get All Alerts
// Table View
const getAlerts = catchAsync(async (req, res, next) => {
  const cacheKey = "alerts:all";
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  const alerts = await alertRepo
    .createQueryBuilder("alert")
    .leftJoin("Terminal", "t", "t.id = alert.terminalID")
    .leftJoin("Neighborhood", "n", "n.terminalID = alert.terminalID")
    .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
    .select([
      "alert.id AS alertId",
      "alert.terminalID AS terminalId",
      "alert.alertType AS alertType",
      "alert.status AS status",
      "alert.dateTimeSent AS lastSignalTime",
      "t.name AS terminalName",
      "fp.address AS address",
    ])
    .orderBy(`CASE WHEN alert.alertType = 'Critical' THEN 0 ELSE 1 END`, "DESC")
    .addOrderBy("alert.dateTimeSent", "DESC")
    .getRawMany();

  await setCache(cacheKey, alerts, 10);
  res.json(alerts);
});

// List all alerts with Dispatched Alerts
// Table View
const getDispatchedAlerts = catchAsync(async (req, res, next) => {
	const cacheKey = "alerts:dispatched";
	const cached = await getCache(cacheKey);
	if (cached) return res.json(cached);

	const alerts = await alertRepo
		.createQueryBuilder("alert")
		.leftJoin("Terminal", "t", "t.id = alert.terminalID")
		.leftJoin("Neighborhood", "n", "n.terminalID = alert.terminalID")
		.leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
		.select([
			"alert.id AS alertId",
			"alert.terminalID AS terminalId",
			"alert.alertType AS alertType",
			"alert.status AS status",
			"alert.dateTimeSent AS lastSignalTime",
			"t.name AS terminalName",
			"fp.address AS address",
		])
		.where("alert.status = :status", { status: "Dispatched" })
		.orderBy(`CASE WHEN alert.alertType = 'Critical' THEN 0 ELSE 1 END`, "DESC")
		.addOrderBy("alert.dateTimeSent", "DESC")
		.getRawMany();

	await setCache(cacheKey, alerts, 10);
	res.json(alerts);
});

// List All Alerts with waitlist status
// Table View
const getWaitlistedAlerts = catchAsync(async (req, res, next) => {
  const cacheKey = "alerts:waitlist";
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  const alerts = await alertRepo
		.createQueryBuilder("alert")
		.leftJoin("Terminal", "t", "t.id = alert.terminalID")
		.leftJoin("Neighborhood", "n", "n.terminalID = alert.terminalID")
		.leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
		.select([
			"alert.id AS alertId",
			"alert.terminalID AS terminalId",
			"alert.alertType AS alertType",
			"alert.status AS status",
			"alert.dateTimeSent AS lastSignalTime",
			"t.name AS terminalName",
			"fp.address AS address",
		])
		.where("alert.status = :status", { status: "Waitlist" })
		.orderBy(`CASE WHEN alert.alertType = 'Critical' THEN 0 ELSE 1 END`, "DESC")
		.addOrderBy("alert.dateTimeSent", "DESC")
		.getRawMany();

  await setCache(cacheKey, alerts, 10);
  res.json(alerts);
});

// List Alerts with Unassigned Status
// Table View
const getUnassignedAlerts = catchAsync(async (req, res, next) => {
  const cacheKey = "alerts:unassigned";
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  const alerts = await alertRepo
		.createQueryBuilder("alert")
		.leftJoin("Terminal", "t", "t.id = alert.terminalID")
		.leftJoin("Neighborhood", "n", "n.terminalID = alert.terminalID")
		.leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
		.select([
			"alert.id AS alertId",
			"alert.terminalID AS terminalId",
			"alert.alertType AS alertType",
			"alert.status AS status",
			"alert.dateTimeSent AS lastSignalTime",
			"t.name AS terminalName",
			"fp.address AS address",
		])
		.where("alert.status = :status", { status: "Unassigned" })
		.orderBy(`CASE WHEN alert.alertType = 'Critical' THEN 0 ELSE 1 END`, "DESC")
		.addOrderBy("alert.dateTimeSent", "DESC")
		.getRawMany();

  await setCache(cacheKey, alerts, 10);
  res.json(alerts);
});

// Get Unassigned Map Alerts
// Map View - Display ALL occupied terminals (terminals with neighborhood/focal person)
const getUnassignedMapAlerts = catchAsync(async (req, res, next) => {
  const cacheKey = "mapAlerts:allOccupied";
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log('[BACKEND] Returning cached occupied terminals:', cached.length);
    return res.json(cached);
  }

  console.log('[BACKEND] Fetching all occupied terminals from database...');

  // FIXED latest alert subquery (NULL-safe)
  const latestAlertSQ = alertRepo
    .createQueryBuilder("a")
    .select("a.terminalID", "terminal_id")
    .addSelect("MAX(a.dateTimeSent)", "last_time")
    .where("a.dateTimeSent IS NOT NULL")
    .groupBy("a.terminalID");

  const terminals = await terminalRepo
    .createQueryBuilder("t")
    // ... neighborhood and focalperson joins remain the same ...
    .leftJoin("neighborhood", "n", "n.terminalID = t.id")
    .leftJoin("focalpersons", "fp", "fp.id = n.focalPersonID")

    // FIX: Use a callback for the subquery instead of string concatenation
    .leftJoin(subQuery => {
      return subQuery
        .select("a.terminalID", "terminal_id")
        .addSelect("MAX(a.dateTimeSent)", "last_time")
        .from("alerts", "a") // Use the actual table name or Alert entity
        .where("a.dateTimeSent IS NOT NULL")
        .groupBy("a.terminalID");
    }, "latest_alert", "latest_alert.terminal_id = t.id")

    // FIX: Now "latestAlert" is properly registered for this join
    .leftJoin(
      "alerts",
      "alert",
      "alert.terminalID = t.id AND alert.dateTimeSent = latest_alert.last_time"
    )
    .select([
      "t.id AS terminalId",
      "t.name AS terminalName",
      "t.status AS terminalStatus",
      "alert.id AS alertId",
      "alert.alertType AS alertType",
      "COALESCE(alert.dateTimeSent, t.dateCreated) AS timeSent",
      "alert.status AS alertStatus",
      "fp.id AS focalPersonId",
      "fp.firstName AS focalFirstName",
      "fp.lastName AS focalLastName",
      "fp.address AS focalAddress",
      "fp.contactNumber AS focalContactNumber",
    ])
    .where("n.focalPersonID IS NOT NULL")
    .getRawMany();

  console.log('[BACKEND] Found occupied terminals:', terminals.length);
  if (terminals.length > 0) {
    console.log('[BACKEND] First terminal sample:', {
      terminalId: terminals[0].terminalId,
      terminalName: terminals[0].terminalName,
      terminalStatus: terminals[0].terminalStatus,
      focalAddress: terminals[0].focalAddress
    });
  }

  await setCache(cacheKey, terminals, 10);
  res.json(terminals);
});

// Read Single Alert
// Table View More Info
const getAlert = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const cacheKey = `alert:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  const row = await alertRepo
    .createQueryBuilder("alert")
    .leftJoin("Terminal", "t", "t.id = alert.terminalID")
    .leftJoin("Neighborhood", "n", "n.terminalID = alert.terminalID")
    .leftJoin("FocalPerson", "fp", "fp.id = n.focalPersonID")
    .select([
      "alert.id AS alertID",
      "alert.terminalID AS terminalID",
      "t.name AS terminalName",
      "alert.alertType AS alertType",
      "alert.status AS status",
      "alert.dateTimeSent AS timeSent",
      "fp.address AS address",
    ])
    .where("alert.id = :id", { id })
    .getRawOne();

  if (!row) return next(new NotFoundError("Alert Not Found"));

  await setCache(cacheKey, row, 10);
  return res.json(row);
});

// UPDATE Alert Status
const updateAlertStatus = catchAsync(async (req, res, next) => {
    const { alertID } = req.params;
    const { action } = req.body; // "waitlist" or "dispatch"

    // 1. Find alert
    const alert = await alertRepo.findOne({
      where: { id: alertID },
      relations: ["terminal"],
    });

    // 2. Validate that rescue form exists
    const rescueForm = await rescueFormRepo.findOne({ where: { emergencyID: alertID } });
    if (!rescueForm) {
        return next(new BadRequestError("Rescue Form must be created before dispatching or waitlisting"));
    }

    // 3. Update status
    if (action === "waitlist") {
        alert.status = "Waitlist";
    } else if (action === "dispatch") {
        alert.status = "Dispatched";
    } else {
        return next(new BadRequestError("Invalid action. Use 'waitlist' or 'dispatch'."));
    }

    await alertRepo.save(alert);

    // Send Downlink ONLY when DISPATCHED
    if (alert.status === "Dispatched") {
      if (!alert.terminal?.devEUI) {
        console.warn(
          `[Downlink Skipped] Terminal has no DevEUI for alert ${alert.id}`
        );
      } else {
        await sendDownlink(
          alert.terminal.devEUI,
          alert.status
        );
      }
    }

    //  Realtime broadcast
    getIO().to("alerts:all").emit("alertStatusUpdated", {
    alertID: alert.id,
    newStatus: alert.status,
    });


    return res.status(200).json({
        message: `Alert ${action === "waitlist" ? "added to waitlist" : "dispatched successfully"}`,
        alert,
    });
});



module.exports = {
	createCriticalAlert,
	createUserInitiatedAlert,
  getMapAlert,
	getAlerts,
	getDispatchedAlerts,
	getWaitlistedAlerts,
	getUnassignedAlerts,
	getUnassignedMapAlerts,
	getAlert,
	updateAlertStatus 
};

