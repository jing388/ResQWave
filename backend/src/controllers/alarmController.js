const { AppDataSource } = require("../config/dataSource");
const { BadRequestError, NotFoundError } = require("../exceptions");
const catchAsync = require("../utils/catchAsync");
const alarmRepo = AppDataSource.getRepository("Alarm");
const terminalRepo = AppDataSource.getRepository("Terminal");
const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");
const focalPersonRepo = AppDataSource.getRepository("FocalPerson");

// Helper function to parse address JSON and extract only the address string
const parseAddress = (addressData) => {
    if (!addressData) return null;
    
    try {
        // If it's already a string (not JSON), return it
        if (typeof addressData === 'string' && !addressData.startsWith('{')) {
            return addressData;
        }
        
        // Parse JSON and extract address field
        const parsed = typeof addressData === 'string' ? JSON.parse(addressData) : addressData;
        return parsed.address || null;
    } catch (error) {
        // If parsing fails, return the original data or null
        return typeof addressData === 'string' ? addressData : null;
    }
};

const getAllAlarms = catchAsync(async (req, res, next) => {
    // Use query builder to join with terminal, neighborhood, and focal person
    const alarms = await alarmRepo
        .createQueryBuilder("alarm")
        .leftJoinAndSelect("Terminal", "terminal", "alarm.terminalID = terminal.id")
        .leftJoinAndSelect("Neighborhood", "neighborhood", "terminal.id = neighborhood.terminalID")
        .leftJoinAndSelect("FocalPerson", "focalPerson", "neighborhood.focalPersonID = focalPerson.id")
        .select([
            "alarm.id",
            "alarm.terminalID",
            "alarm.terminalName",
            "alarm.name",
            "alarm.status",
            "alarm.severity",
            "alarm.createdAt",
            "alarm.updatedAt",
            "focalPerson.address"
        ])
        .where("alarm.archived = :archived", { archived: false })
        .orderBy("alarm.createdAt", "DESC")
        .getRawMany();

    // Format the results
    const formattedAlarms = alarms.map(alarm => ({
        id: alarm.alarm_id,
        terminalID: alarm.alarm_terminalID,
        terminalName: alarm.alarm_terminalName,
        name: alarm.alarm_name,
        status: alarm.alarm_status,
        severity: alarm.alarm_severity,
        createdAt: alarm.alarm_createdAt,
        updatedAt: alarm.alarm_updatedAt,
        terminalAddress: parseAddress(alarm.focalPerson_address)
    }));

    res.status(200).json(formattedAlarms);
});

const createAlarm = catchAsync(async (req, res, next) => {
    const { terminalID, name, status, severity } = req.body;

    // Basic validation
    if (!terminalID || !name || !status || !severity) {
        return next(new BadRequestError("Missing required fields"));
    }

    // Fetch terminal to get the name
    const terminal = await terminalRepo.findOne({ 
        where: { 
            id: terminalID,
            archived: false 
        } 
    });
    if (!terminal) {
        return next(new NotFoundError("Terminal not found or is archived"));
    }

    // Generate ID
    const lastAlarm = await alarmRepo.find({
        order: { id: "DESC" },
        take: 1
    });
    const nextId = (lastAlarm.length > 0 ? lastAlarm[0].id : 0) + 1;

    const newAlarm = alarmRepo.create({
        id: nextId,
        terminalID,
        terminalName: terminal.name,
        name,
        status,
        severity
    });

    await alarmRepo.save(newAlarm);
    res.status(201).json(newAlarm);
});

const getAlarmById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // Use query builder to join with terminal, neighborhood, and focal person
    const alarm = await alarmRepo
        .createQueryBuilder("alarm")
        .leftJoinAndSelect("Terminal", "terminal", "alarm.terminalID = terminal.id")
        .leftJoinAndSelect("Neighborhood", "neighborhood", "terminal.id = neighborhood.terminalID")
        .leftJoinAndSelect("FocalPerson", "focalPerson", "neighborhood.focalPersonID = focalPerson.id")
        .select([
            "alarm.id",
            "alarm.terminalID",
            "alarm.terminalName",
            "alarm.name",
            "alarm.status",
            "alarm.severity",
            "alarm.createdAt",
            "alarm.updatedAt",
            "focalPerson.address"
        ])
        .where("alarm.id = :id", { id })
        .getRawOne();

    if (!alarm) {
        return next(new NotFoundError("Alarm not found"));
    }

    // Format the result
    const formattedAlarm = {
        id: alarm.alarm_id,
        terminalID: alarm.alarm_terminalID,
        terminalName: alarm.alarm_terminalName,
        name: alarm.alarm_name,
        status: alarm.alarm_status,
        severity: alarm.alarm_severity,
        createdAt: alarm.alarm_createdAt,
        updatedAt: alarm.alarm_updatedAt,
        terminalAddress: parseAddress(alarm.focalPerson_address)
    };

    res.status(200).json(formattedAlarm);
});

const getActiveAlarms = catchAsync(async (req, res, next) => {
    const alarms = await alarmRepo
        .createQueryBuilder("alarm")
        .leftJoinAndSelect("Terminal", "terminal", "alarm.terminalID = terminal.id")
        .leftJoinAndSelect("Neighborhood", "neighborhood", "terminal.id = neighborhood.terminalID")
        .leftJoinAndSelect("FocalPerson", "focalPerson", "neighborhood.focalPersonID = focalPerson.id")
        .select([
            "alarm.id",
            "alarm.terminalID",
            "alarm.terminalName",
            "alarm.name",
            "alarm.status",
            "alarm.severity",
            "alarm.createdAt",
            "alarm.updatedAt",
            "focalPerson.address"
        ])
        .where("alarm.archived = :archived", { archived: false })
        .andWhere("alarm.status = :status", { status: "Active" })
        .orderBy("alarm.createdAt", "DESC")
        .getRawMany();

    const formattedAlarms = alarms.map(alarm => ({
        id: alarm.alarm_id,
        terminalID: alarm.alarm_terminalID,
        terminalName: alarm.alarm_terminalName,
        name: alarm.alarm_name,
        status: alarm.alarm_status,
        severity: alarm.alarm_severity,
        createdAt: alarm.alarm_createdAt,
        updatedAt: alarm.alarm_updatedAt,
        terminalAddress: parseAddress(alarm.focalPerson_address)
    }));

    res.status(200).json(formattedAlarms);
});

const getClearedAlarms = catchAsync(async (req, res, next) => {
    const alarms = await alarmRepo
        .createQueryBuilder("alarm")
        .leftJoinAndSelect("Terminal", "terminal", "alarm.terminalID = terminal.id")
        .leftJoinAndSelect("Neighborhood", "neighborhood", "terminal.id = neighborhood.terminalID")
        .leftJoinAndSelect("FocalPerson", "focalPerson", "neighborhood.focalPersonID = focalPerson.id")
        .select([
            "alarm.id",
            "alarm.terminalID",
            "alarm.terminalName",
            "alarm.name",
            "alarm.status",
            "alarm.severity",
            "alarm.createdAt",
            "alarm.updatedAt",
            "focalPerson.address"
        ])
        .where("alarm.archived = :archived", { archived: false })
        .andWhere("alarm.status = :status", { status: "Cleared" })
        .orderBy("alarm.createdAt", "DESC")
        .getRawMany();

    const formattedAlarms = alarms.map(alarm => ({
        id: alarm.alarm_id,
        terminalID: alarm.alarm_terminalID,
        terminalName: alarm.alarm_terminalName,
        name: alarm.alarm_name,
        status: alarm.alarm_status,
        severity: alarm.alarm_severity,
        createdAt: alarm.alarm_createdAt,
        updatedAt: alarm.alarm_updatedAt,
        terminalAddress: parseAddress(alarm.focalPerson_address)
    }));

    res.status(200).json(formattedAlarms);
});

const archiveAlarm = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const alarm = await alarmRepo.findOne({ where: { id } });
    
    if (!alarm) {
        return next(new NotFoundError("Alarm not found"));
    }

    alarm.archived = true;
    await alarmRepo.save(alarm);

    res.status(200).json({ message: "Alarm archived successfully" });
});

const unarchiveAlarm = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const alarm = await alarmRepo.findOne({ where: { id } });

    if (!alarm) {
        return next(new NotFoundError("Alarm not found"));
    }

    if (!alarm.archived) {
        return next(new BadRequestError("Alarm is not archived"));
    }

    alarm.archived = false;
    await alarmRepo.save(alarm);

    res.status(200).json({ message: "Alarm restored successfully" });
});

const deleteAlarmPermanently = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const alarm = await alarmRepo.findOne({ where: { id } });

    if (!alarm) {
        return next(new NotFoundError("Alarm not found"));
    }

    if (!alarm.archived) {
         return next(new BadRequestError("Only archived alarms can be permanently deleted"));
    }

    await alarmRepo.remove(alarm);

    res.status(200).json({ message: "Alarm deleted permanently" });
});

const getArchivedAlarms = catchAsync(async (req, res, next) => {
    const alarms = await alarmRepo
        .createQueryBuilder("alarm")
        .leftJoinAndSelect("Terminal", "terminal", "alarm.terminalID = terminal.id")
        .leftJoinAndSelect("Neighborhood", "neighborhood", "terminal.id = neighborhood.terminalID")
        .leftJoinAndSelect("FocalPerson", "focalPerson", "neighborhood.focalPersonID = focalPerson.id")
        .select([
            "alarm.id",
            "alarm.terminalID",
            "alarm.terminalName",
            "alarm.name",
            "alarm.status",
            "alarm.severity",
            "alarm.createdAt",
            "alarm.updatedAt",
            "focalPerson.address"
        ])
        .where("alarm.archived = :archived", { archived: true })
        .orderBy("alarm.createdAt", "DESC")
        .getRawMany();

    const formattedAlarms = alarms.map(alarm => ({
        id: alarm.alarm_id,
        terminalID: alarm.alarm_terminalID,
        terminalName: alarm.alarm_terminalName,
        name: alarm.alarm_name,
        status: alarm.alarm_status,
        severity: alarm.alarm_severity,
        createdAt: alarm.alarm_createdAt,
        updatedAt: alarm.alarm_updatedAt,
        terminalAddress: parseAddress(alarm.focalPerson_address)
    }));

    res.status(200).json(formattedAlarms);
});

module.exports = {
    getAllAlarms,
    getActiveAlarms,
    getClearedAlarms,
    createAlarm,
    getAlarmById,
    archiveAlarm,
    unarchiveAlarm,
    deleteAlarmPermanently,
    getArchivedAlarms
};
