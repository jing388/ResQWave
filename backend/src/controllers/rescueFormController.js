const { AppDataSource } = require("../config/dataSource");
const rescueFormRepo = AppDataSource.getRepository("RescueForm");
const alertRepo = AppDataSource.getRepository("Alert");
const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");
const terminalRepo = AppDataSource.getRepository("Terminal");
const focalPersonRepo = AppDataSource.getRepository("FocalPerson");
// const postRescueRepo = AppDataSource.getRepository("PostRescueForm"); // removed unused postRescueRepo variable
const {
    getCache,
    setCache,
    deleteCache
} = require("../config/cache");
const { getIO } = require("../realtime/socket");

// CREATE Rescue Form
const createRescueForm = async (req, res) => {
    try {
        const { alertID } = req.params;

        console.log('[RescueForm] Creating rescue form for alert:', alertID);
        console.log('[RescueForm] Request body:', JSON.stringify(req.body, null, 2));

        // Check if the Alert exists
        const alert = await alertRepo.findOne({ where: { id: alertID } });
        if (!alert) {
            console.log('[RescueForm] Alert not found:', alertID);
            return res.status(404).json({ message: "Alert Not Found" });
        }

        // Capture the original alert type BEFORE it gets modified for dispatch
        const originalAlertType = alert.alertType;
        console.log('[RescueForm] Captured original alert type:', originalAlertType);

        // Prevent Duplicate Form
        const existing = await rescueFormRepo.findOne({ where: { emergencyID: alertID } });
        if (existing) {
            return res.status(400).json({ message: "Rescue Form Already Exists" });
        }

        // Generate Custom ID
        const lastForm = await rescueFormRepo
            .createQueryBuilder("rescueform")
            .orderBy("rescueform.id", "DESC")
            .getOne();

        const newNumber = lastForm ? parseInt(lastForm.id.replace("RF", ""), 10) + 1 : 1;
        const newID = "RF" + String(newNumber).padStart(3, "0");

        // Get focalPersonID from neighborhood relationship
        const neighborhood = await neighborhoodRepo.findOne({
            where: { terminalID: alert.terminalID }
        });

        const focalPersonID = neighborhood?.focalPersonID || null;

        const {
            focalUnreachable,
            waterLevel,
            waterLevelDetails,
            urgencyOfEvacuation,
            urgencyDetails,
            hazardPresent,
            hazardDetails,
            accessibility,
            accessibilityDetails,
            resourceNeeds,
            resourceDetails,
            otherInformation,
            status = 'Waitlisted' // Default status
        } = req.body;

        //  Validation: if focal is reachable, all main fields are required
        if (focalUnreachable === false) {
            if (
                !waterLevel ||
                !urgencyOfEvacuation ||
                !hazardPresent ||
                !accessibility ||
                !resourceNeeds
            ) {
                return res.status(400).json({
                    message: "All rescue details are required when focal is reachable."
                });
            }
        }

        // Get Logged-In Dispatcher (or Admin)
        const dispatcherID = req.user?.id;
        const userRole = req.user?.role?.toLowerCase();

        console.log('[RescueForm] Dispatcher ID from req.user:', dispatcherID);
        console.log('[RescueForm] User role:', userRole);

        if (!dispatcherID) {
            return res.status(401).json({ message: "Unauthorized: User Not Found" });
        }

        // Check if user is admin - admins cannot create rescue forms
        if (userRole === 'admin') {
            console.log('[RescueForm] Admin attempting to create rescue form - blocking request');
            return res.status(403).json({ 
                message: "Access denied: Only dispatchers can create rescue forms. You are currently in the admin interface.",
                code: "ADMIN_CANNOT_CREATE_RESCUE_FORM"
            });
        }

        // Only dispatchers can create rescue forms
        if (userRole !== 'dispatcher') {
            console.log('[RescueForm] Non-dispatcher user attempting to create rescue form:', userRole);
            return res.status(403).json({ 
                message: "Access denied: Only dispatchers can create rescue forms.",
                code: "INVALID_USER_ROLE"
            });
        }

        const finalDispatcherID = dispatcherID;

        // Combine main selection with details
        const waterLevelCombined = waterLevelDetails
            ? `${waterLevel} - ${waterLevelDetails}`
            : waterLevel;

        const urgencyCombined = urgencyDetails
            ? `${urgencyOfEvacuation} - ${urgencyDetails}`
            : urgencyOfEvacuation;

        const hazardCombined = hazardDetails
            ? `${hazardPresent} - ${hazardDetails}`
            : hazardPresent;

        const accessibilityCombined = accessibilityDetails
            ? `${accessibility} - ${accessibilityDetails}`
            : accessibility;

        const resourcesCombined = resourceDetails
            ? `${resourceNeeds} - ${resourceDetails}`
            : resourceNeeds;

        const newForm = rescueFormRepo.create({
            id: newID,
            emergencyID: alert.id,
            dispatcherID: finalDispatcherID,
            focalPersonID,
            focalUnreachable,
            originalAlertType, // Store the original alert type here
            waterLevel: waterLevelCombined || null,
            urgencyOfEvacuation: urgencyCombined || null,
            hazardPresent: hazardCombined || null,
            accessibility: accessibilityCombined || null,
            resourceNeeds: resourcesCombined || null,
            otherInformation: otherInformation || null,
            status: status // 'Waitlisted' or 'Dispatched'
        });

        console.log('[RescueForm] About to save form:', JSON.stringify(newForm, null, 2));
        await rescueFormRepo.save(newForm);
        console.log('[RescueForm] Form saved successfully:', newForm.id);

        // Update alert and terminal when dispatched
        if (status === 'Dispatched') {
            alert.status = 'Dispatched';
            alert.alertType = null; // Clear alert type since rescue is complete
            await alertRepo.save(alert);
            console.log('[RescueForm] Alert updated: status=Dispatched, alertType=null');

            // Keep terminal online (rescue is done)
            const terminal = await terminalRepo.findOne({ where: { id: alert.terminalID } });
            if (terminal) {
                terminal.status = 'Online';
                await terminalRepo.save(terminal);
                console.log('[RescueForm] Terminal kept online:', terminal.id);
            }

            // Emit real-time alert status update to all connected clients
            try {
                const io = getIO();

                // Get updated alert data with relationships for complete payload
                const updatedAlert = await alertRepo
                    .createQueryBuilder("alert")
                    .leftJoinAndSelect("alert.terminal", "terminal")
                    .where("alert.id = :id", { id: alert.id })
                    .getOne();

                // Get focal person data
                const neighborhood = await neighborhoodRepo.findOne({
                    where: { terminalID: alert.terminalID }
                });

                let focalPerson = null;
                if (neighborhood?.focalPersonID) {
                    focalPerson = await focalPersonRepo.findOne({
                        where: { id: neighborhood.focalPersonID }
                    });
                }

                const alertUpdatePayload = {
                    alertId: updatedAlert.id,
                    alertType: null, // Now null since dispatched
                    timeSent: updatedAlert.dateTimeSent || updatedAlert.createdAt || new Date(),
                    alertStatus: 'Dispatched', // New status
                    terminalId: updatedAlert.terminalID,
                    terminalName: updatedAlert.terminal?.name || `Terminal ${updatedAlert.terminalID}`,
                    terminalStatus: 'Online',
                    focalPersonId: focalPerson?.id || null,
                    focalFirstName: focalPerson?.firstName || 'N/A',
                    focalLastName: focalPerson?.lastName || '',
                    focalAddress: focalPerson?.address || null,
                    focalContactNumber: focalPerson?.contactNumber || 'N/A',
                    // Include rescue form info for waitlist removal
                    rescueFormId: newForm.id,
                    rescueFormStatus: 'Dispatched'
                };

                io.to("alerts:all").emit("alert:statusUpdate", alertUpdatePayload);
                io.to(`terminal:${alert.terminalID}`).emit("alert:statusUpdate", alertUpdatePayload);
                console.log('[RescueForm] Alert status update broadcasted:', alertUpdatePayload);

                // Also emit specific waitlist removal event
                const waitlistRemovalPayload = {
                    alertId: alert.id,
                    rescueFormId: newForm.id,
                    action: 'dispatched'
                };
                io.to("alerts:all").emit("waitlist:formRemoved", waitlistRemovalPayload);
                console.log('[RescueForm] Waitlist removal broadcasted:', waitlistRemovalPayload);
            } catch (socketError) {
                console.error('[RescueForm] Error emitting alert status update:', socketError);
            }
        }

        // Invalidate Cache
        const cacheKey = `rescueForm:${alertID}`;
        const existingCache = await getCache(cacheKey);
        if (existingCache) {
            await deleteCache(cacheKey);
            console.log(`[Cache] Invalidated: ${cacheKey}`);
        }

        res.status(201).json(newForm);
    } catch (err) {
        console.error('[RescueForm Controller] Error creating rescue form:', err);
        res.status(500).json({
            message: "Server Error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};


// READ RESCUE FORM
const getRescueForm = async (req, res) => {
    try {
        const { formID } = req.params;
        const cacheKey = `rescueForm:${formID}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const form = await rescueFormRepo
            .createQueryBuilder("form")
            .leftJoinAndSelect("form.alert", "alert")
            .leftJoinAndSelect("alert.terminal", "terminal")
            .where("form.id = :id", { id: formID })
            .getOne();

        if (!form) {
            return res.status(404).json({ message: "Rescue Form Not Found" });
        }

        const responseData = {
            terminalName: form.alert?.terminal?.name || null,
            focalUnreachable: form.focalUnreachable,
            waterLevel: form.waterLevel,
            urgencyOfEvacuation: form.urgencyOfEvacuation,
            hazardPresent: form.hazardPresent,
            accessibility: form.accessibility,
            resourceNeeds: form.resourceNeeds,
            otherInformation: form.otherInformation,
        };

        await setCache(cacheKey, responseData, 300);
        res.json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// Read ALL Rescue Forms
const getRescueForms = async (req, res) => {
    try {
        const cacheKey = "rescueForms:all";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const forms = await rescueFormRepo
            .createQueryBuilder("form")
            .leftJoinAndSelect("form.alert", "alert")
            .leftJoinAndSelect("alert.terminal", "terminal")
            .orderBy("form.id", "DESC")
            .getMany();

        const data = forms.map((form) => ({
            formID: form.id,
            alertID: form.emergencyID,
            terminalName: form.alert?.terminal?.name || null,
            focalUnreachable: form.focalUnreachable,
            waterLevel: form.waterLevel,
            urgencyOfEvacuation: form.urgencyOfEvacuation,
            hazardPresent: form.hazardPresent,
            accessibility: form.accessibility,
            resourceNeeds: form.resourceNeeds,
            otherInformation: form.otherInformation,
        }));

        await setCache(cacheKey, data, 300);
        return res.json(data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server Error" });
    }
};

// UPDATE Rescue Form Status (for dispatching waitlisted forms)
const updateRescueFormStatus = async (req, res) => {
    try {
        const { alertID } = req.params;
        const { status } = req.body;

        console.log('[RescueForm] Updating status for alert:', alertID, 'to:', status);

        // Find existing form
        const form = await rescueFormRepo.findOne({ where: { emergencyID: alertID } });
        if (!form) {
            return res.status(404).json({ message: "Rescue Form Not Found" });
        }

        // Get the alert to capture original alert type if not already captured
        const alert = await alertRepo.findOne({ where: { id: alertID } });
        if (alert && !form.originalAlertType && alert.alertType) {
            form.originalAlertType = alert.alertType;
            console.log('[RescueForm] Captured original alert type during update:', alert.alertType);
        }

        // Update status
        form.status = status;
        await rescueFormRepo.save(form);

        // Update alert and terminal when dispatched
        if (status === 'Dispatched') {
            const alert = await alertRepo.findOne({ where: { id: alertID } });
            if (alert) {
                alert.status = 'Dispatched';
                alert.alertType = null; // Clear alert type since rescue is complete
                await alertRepo.save(alert);
                console.log('[RescueForm] Alert updated: status=Dispatched, alertType=null');

                // Keep terminal online (rescue is done)
                const terminal = await terminalRepo.findOne({ where: { id: alert.terminalID } });
                if (terminal) {
                    terminal.status = 'Online';
                    await terminalRepo.save(terminal);
                    console.log('[RescueForm] Terminal kept online:', terminal.id);
                }

                // Emit real-time alert status update to all connected clients
                try {
                    const io = getIO();

                    // Get updated alert data with relationships for complete payload
                    const updatedAlert = await alertRepo
                        .createQueryBuilder("alert")
                        .leftJoinAndSelect("alert.terminal", "terminal")
                        .where("alert.id = :id", { id: alert.id })
                        .getOne();

                    // Get focal person data
                    const neighborhood = await neighborhoodRepo.findOne({
                        where: { terminalID: alert.terminalID }
                    });

                    let focalPerson = null;
                    if (neighborhood?.focalPersonID) {
                        focalPerson = await focalPersonRepo.findOne({
                            where: { id: neighborhood.focalPersonID }
                        });
                    }

                    const alertUpdatePayload = {
                        alertId: updatedAlert.id,
                        alertType: null, // Now null since dispatched
                        timeSent: updatedAlert.dateTimeSent || updatedAlert.createdAt || new Date(),
                        alertStatus: 'Dispatched', // New status
                        terminalId: updatedAlert.terminalID,
                        terminalName: updatedAlert.terminal?.name || `Terminal ${updatedAlert.terminalID}`,
                        terminalStatus: 'Online',
                        focalPersonId: focalPerson?.id || null,
                        focalFirstName: focalPerson?.firstName || 'N/A',
                        focalLastName: focalPerson?.lastName || '',
                        focalAddress: focalPerson?.address || null,
                        focalContactNumber: focalPerson?.contactNumber || 'N/A',
                        // Include rescue form info for waitlist removal
                        rescueFormId: form.id,
                        rescueFormStatus: 'Dispatched'
                    };

                    io.to("alerts:all").emit("alert:statusUpdate", alertUpdatePayload);
                    io.to(`terminal:${alert.terminalID}`).emit("alert:statusUpdate", alertUpdatePayload);
                    console.log('[RescueForm] Alert status update broadcasted:', alertUpdatePayload);

                    // Also emit specific waitlist removal event
                    const waitlistRemovalPayload = {
                        alertId: alert.id,
                        rescueFormId: form.id,
                        action: 'dispatched'
                    };
                    io.to("alerts:all").emit("waitlist:formRemoved", waitlistRemovalPayload);
                    console.log('[RescueForm] Waitlist removal broadcasted:', waitlistRemovalPayload);
                } catch (socketError) {
                    console.error('[RescueForm] Error emitting alert status update:', socketError);
                }
            }
        }

        // Invalidate Cache
        const cacheKey = `rescueForm:${alertID}`;
        await deleteCache(cacheKey);

        console.log('[RescueForm] Status updated successfully');
        res.json(form);
    } catch (err) {
        console.error('[RescueForm Controller] Error updating status:', err);
        res.status(500).json({
            message: "Server Error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Rescue Form
// Pending Table
const getAggregatedRescueForm = async (req, res) => {
    try {
        const { alertID } = req.query || {};
        const cacheKey = alertID ? `rescueAggregatesBasic:${alertID}` : `rescueAggregatesBasic:all`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        let qb = rescueFormRepo
            .createQueryBuilder("rf")
            .leftJoin("rf.alert", "alert")
            .leftJoin("rf.focalPerson", "fp")
            .leftJoin("rf.dispatcher", "dispatcher");

        if (alertID) {
            qb = qb.where("alert.id = :alertID", { alertID });
        }

        const rows = await qb
            .select([
                "rf.emergencyID AS emergencyId",
                "alert.terminalID AS terminalId",
                "fp.firstName AS focalFirstName",
                "fp.lastName AS focalLastName",
                "alert.dateTimeSent AS dateTimeOccurred",
                "alert.alertType AS alertType",
                "fp.address AS houseAddress",
                "dispatcher.name AS dispatchedName",
            ])
            .orderBy("rf.id", "DESC")
            .getRawMany();

        await setCache(cacheKey, rows, 300);
        return res.json(rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server Error" });
    }
};


module.exports = {
    createRescueForm,
    getRescueForm,
    getRescueForms,
    getAggregatedRescueForm,
    updateRescueFormStatus
};