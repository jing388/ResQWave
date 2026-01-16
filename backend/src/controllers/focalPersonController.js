const { AppDataSource } = require("../config/dataSource");
const bcrypt = require("bcrypt");
const { generateTemporaryPassword, sendTemporaryPasswordEmail } = require("../utils/passwordUtils");

const focalPersonRepo = AppDataSource.getRepository("FocalPerson");
const { getCache, setCache, deleteCache} = require("../config/cache");
const { diffFields, addLogs } = require("../utils/logs");
const { addAdminLog } = require("../utils/adminLogs");
const catchAsync = require("../utils/catchAsync");
const { BadRequestError, NotFoundError, ForbiddenError, AppError } = require("../exceptions");
const registrationRepo = AppDataSource.getRepository("FocalPersonRegistration");
const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");
const focalRepo = AppDataSource.getRepository("FocalPerson");
const terminalRepo = AppDataSource.getRepository("Terminal");

// Helper to check database configuration
const checkDatabaseConfig = async () => {
    try {
        const result = await AppDataSource.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        const maxPacketSize = result[0]?.Value || "unknown";
        console.log("Database max_allowed_packet:", maxPacketSize);
        
        // Convert bytes to MB for easier reading
        if (maxPacketSize !== "unknown") {
            const sizeInMB = (parseInt(maxPacketSize) / (1024 * 1024)).toFixed(2);
            console.log("Database max_allowed_packet in MB:", sizeInMB);
            
            // Warn if packet size is too small for photo uploads
            if (parseInt(maxPacketSize) < 4 * 1024 * 1024) { // Less than 4MB
                console.warn("WARNING: max_allowed_packet is quite small for photo uploads.");
                console.warn("Consider increasing it in MySQL config: SET GLOBAL max_allowed_packet=16777216; (16MB)");
            }
        }
        
        return maxPacketSize;
    } catch (err) {
        console.error("Could not check database config:", err.message);
        return "unknown";
    }
};

// Helper to strip sensitive fields before caching
function sanitizeFP(fp) {
    if (!fp) return fp;
    // Remove sensitive fields like password and photo before caching
    const { password, photo, alternativeFPImage, ...rest } = fp;
    return rest;
}

// CREATE FocalPerson 
const createFocalPerson = catchAsync(async (req, res, next) => {
    console.log("CREATE Focal Person - Request received");
    console.log("Body keys:", req.body ? Object.keys(req.body) : "no body");
    console.log("Files:", req.files ? Object.keys(req.files) : "no files");
    console.log("Body sample:", req.body ? JSON.stringify(req.body, null, 2).substring(0, 500) : "no body");
    
    // Check database configuration for debugging
    await checkDatabaseConfig();
    
    const {
        terminalID,
        firstName,
        lastName,
        email,
        contactNumber,
        address,
        altFirstName,
        altLastName,
        altEmail,
        altContactNumber,
        noOfHouseholds,
        noOfResidents,
        floodSubsideHours,
        hazards,
        otherInformation
    } = req.body;

    // Basic validation
    if (!terminalID || !firstName || !lastName || !email || !contactNumber || !address) {
        return next(new BadRequestError("Missing required fields"));
    }

    // Validate terminal and availability
    const terminal = await terminalRepo.findOne({ where: { id: terminalID } });
    if (!terminal) return next(new NotFoundError("Terminal Not Found"));
    if (String(terminal.availability || "").toLowerCase() === "occupied") {
        return next(new BadRequestError("Terminal already occupied"));
    }
    if (terminal.archived) {
        return next(new BadRequestError("Terminal is Archived and cannot be used"));
    }

        const originalTerminalAvailability = terminal.availability || "Available";

    // Uniqueness checks (email/contact must not exist anywhere in focal persons)
    // 1) Primary email
    if (email) {
        const emailInUse = await focalPersonRepo.findOne({
            where: [{ email }, { altEmail: email }],
        });
        if (emailInUse) return next(new BadRequestError("Email already in use"));
    }
    // 2) Primary contact
    if (contactNumber) {
        const contactInUse = await focalPersonRepo.findOne({
            where: [{ contactNumber }, { altContactNumber: contactNumber }],
        });
        if (contactInUse) return next(new BadRequestError("Contact number already in use"));
    }
    // 3) Alt email
    if (altEmail) {
        if (email && altEmail === email) {
            return next(new BadRequestError("Alt email must be different from email"));
        }
        const altEmailInUse = await focalPersonRepo.findOne({
            where: [{ email: altEmail }, { altEmail }],
        });
        if (altEmailInUse) return next(new BadRequestError("Alt email already in use"));
    }
    // 4) Alt contact
    if (altContactNumber) {
        if (contactNumber && altContactNumber === contactNumber) {
            return next(new BadRequestError("Alt contact must be different from contact number"));
        }
        const altContactInUse = await focalPersonRepo.findOne({
            where: [{ contactNumber: altContactNumber }, { altContactNumber }],
        });
        if (altContactInUse) return next(new BadRequestError("Alt contact number already in use"));
    }

        // Generate FOCALP ID (robust numeric ordering on the suffix)
        const PREFIX = "FOCALP";
        const startIndex = PREFIX.length + 1; // SUBSTRING() is 1-based
        const lastFocalPerson = await focalPersonRepo
            .createQueryBuilder("fp")
            .orderBy(`CAST(SUBSTRING(fp.id, ${startIndex}) AS UNSIGNED)`, "DESC")
            .getOne();

        let newFocalNum = 1;
        if (lastFocalPerson?.id) {
            const lastNum = parseInt(String(lastFocalPerson.id).replace(PREFIX, ""), 10);
            if (!Number.isNaN(lastNum)) newFocalNum = lastNum + 1;
        }
        const newFocalID = PREFIX + String(newFocalNum).padStart(3, "0");

        // Generate secure temporary password that meets policy
        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Handle file uploads
        const files = req.files || {};
        const mainPhoto = files.photo?.[0];
        const altPhotoFile = files.altPhoto?.[0]; // incoming field name "altPhoto"

        // Log file sizes for debugging
        if (mainPhoto) {
            console.log("Main photo size:", mainPhoto.size, "bytes");
            if (mainPhoto.size > 2 * 1024 * 1024) {
                console.warn("Main photo exceeds 2MB limit:", mainPhoto.size);
                return res.status(400).json({ message: "Main photo file too large. Maximum size is 2MB." });
            }
        }
        if (altPhotoFile) {
            console.log("Alt photo size:", altPhotoFile.size, "bytes");
            if (altPhotoFile.size > 2 * 1024 * 1024) {
                console.warn("Alt photo exceeds 2MB limit:", altPhotoFile.size);
                return res.status(400).json({ message: "Alternative photo file too large. Maximum size is 2MB." });
            }
        }

        // Always store address as JSON string (prevents [object Object])
        let addressString;
        if (typeof address === "object" && address !== null) {
            addressString = JSON.stringify(address);
        } else if (typeof address === "string") {
            addressString = address;
        } else {
            addressString = "";
        }

        // Normalize hazards to JSON string
        let hazardsString = null;
        if (Array.isArray(hazards)) {
            hazardsString = JSON.stringify(hazards);
        } else if (typeof hazards === "string" && hazards.length) {
            try { hazardsString = JSON.stringify(JSON.parse(hazards)); }
            catch { hazardsString = JSON.stringify(hazards.split(",").map(s => s.trim()).filter(Boolean)); }
        } else {
            hazardsString = JSON.stringify([]); // default
        }

        // Create focal person without photos first (smaller packet size)
        const focalPerson = focalPersonRepo.create({
            id: newFocalID,
            terminalID,
            firstName,
            lastName,
            email,
            contactNumber,
            password: hashedPassword,
            address: addressString || null,
            altFirstName: altFirstName || null,
            altLastName: altLastName || null,
            altEmail: altEmail || null,
            altContactNumber: altContactNumber || null,
            createdBy: req.user?.id || null,
        });

        // Save focal person without photos first
        const savedFocalPerson = await focalPersonRepo.save(focalPerson);

        // Add photos in separate updates to avoid large packet sizes
        if (mainPhoto?.buffer || altPhotoFile?.buffer) {
            console.log("Updating with photos separately to avoid packet size issues");
            
            if (mainPhoto?.buffer) {
                await focalPersonRepo.update(
                    { id: newFocalID },
                    { photo: mainPhoto.buffer }
                );
            }
            
            if (altPhotoFile?.buffer) {
                await focalPersonRepo.update(
                    { id: newFocalID },
                    { alternativeFPImage: altPhotoFile.buffer }
                );
            }
        }

        // Generate Neighborhood ID (N001, N002, ...) by numeric suffix
        const lastNeighborhood = await neighborhoodRepo
            .createQueryBuilder("neighborhood")
            .orderBy("CAST(SUBSTRING(neighborhood.id, 2) AS UNSIGNED)", "DESC")
            .getOne();

        let newNeighborhoodNum = 1;
        if (lastNeighborhood?.id) {
            const lastNum = parseInt(String(lastNeighborhood.id).replace("N", ""), 10);
            if (!Number.isNaN(lastNum)) newNeighborhoodNum = lastNum + 1;
        }
        const newNeighborhoodID = "N" + String(newNeighborhoodNum).padStart(3, "0");

        // Create Neighborhood record (hazards stored as JSON string)
        const neighborhood = neighborhoodRepo.create({
            id: newNeighborhoodID,
            focalPersonID: newFocalID,
            terminalID,
            noOfHouseholds: noOfHouseholds || "",
            noOfResidents: noOfResidents || "",
            floodSubsideHours: floodSubsideHours || "",
            hazards: hazardsString,
            otherInformation: otherInformation || "",
            archived: false,
        });

        await neighborhoodRepo.save(neighborhood);

        // Log focal person creation by dispatcher/admin
        if (req.user?.role === "dispatcher" || req.user?.role === "admin") {
            await addAdminLog({
                action: "create",
                entityType: "FocalPerson",
                entityID: newFocalID,
                entityName: `${firstName} ${lastName}`.trim(),
                dispatcherID: req.user.id,
                dispatcherName: req.user.name
            });

            // Also log neighborhood creation
            await addAdminLog({
                action: "create",
                entityType: "Neighborhood",
                entityID: newNeighborhoodID,
                entityName: `Neighborhood ${newNeighborhoodID}`,
                dispatcherID: req.user.id,
                dispatcherName: req.user.name
            });
        }

        // Mark terminal occupied
        await terminalRepo.update({ id: terminalID }, { availability: "Occupied" });

        // Invalidate caches
        await deleteCache("focalPersons:all");
        await deleteCache("neighborhoods:all");

        // Invalidate terminal caches to reflect availability change immediately
        await deleteCache(`terminal:${terminalID}`);
        await deleteCache("terminals:active");
        await deleteCache("onlineTerminals");
        await deleteCache("offlineTerminals");
        await deleteCache("adminDashboardStats");
        await deleteCache("adminDashboard:aggregatedMap");

        try {
            await sendTemporaryPasswordEmail({
                to: email,
                name: [firstName, lastName].filter(Boolean).join(" "),
                role: "focal",
                focalEmail: email,
                focalNumber: contactNumber,
                password: tempPassword,
            });
        } catch (emailErr) {
            console.error('[FocalPerson] Failed sending temporary password via Brevo:', emailErr);
            await neighborhoodRepo.delete({ id: newNeighborhoodID });
            await focalPersonRepo.delete({ id: newFocalID });
            await terminalRepo.update({ id: terminalID }, { availability: originalTerminalAvailability });
            await deleteCache("focalPersons:all");
            await deleteCache("neighborhoods:all");
            await deleteCache(`terminal:${terminalID}`);
            await deleteCache("terminals:active");
            await deleteCache("onlineTerminals");
            await deleteCache("offlineTerminals");
            await deleteCache("adminDashboardStats");
            await deleteCache("adminDashboard:aggregatedMap");
            return res.status(500).json({ message: "Failed to send temporary password email. Please try again." });
        }

    const response = {
        message: "Focal Person and Neighborhood Created. Temporary password emailed.",
        newFocalID,
        newNeighborhoodID,
    };

    return res.status(201).json(response);
});


const approveFocalRegistration = catchAsync(async (req, res, next) => {
    const registrationID = String(req.params.id || "").trim();
    const { terminalID } = req.body || {};

    if (!registrationID) {
        return next(new BadRequestError("Missing registration ID"));
    }
    if (!terminalID) {
        return next(new BadRequestError("Missing terminal ID"));
    }

    // Load Registration (entity, not the repo)
    const registration = await registrationRepo.findOne({ where: { id: registrationID } });
    if (!registration) {
        return next(new NotFoundError("Registration not found"));
    }
    if ((registration.status || "").toLowerCase() !== "pending") {
        return next(new BadRequestError("Registration is not pending"));
    }

    // Validate Terminal
    const terminal = await terminalRepo.findOne({ where: { id: terminalID } });
    if (!terminal) return next(new NotFoundError("Terminal not found"));
    if (terminal.availability === "occupied") {
        return next(new BadRequestError("Terminal is already occupied"));
    }

        // Generate Focal Person ID (FP001…)
        const lastFocal = await focalRepo
            .createQueryBuilder("fp")
            .orderBy("fp.id", "DESC")
            .getOne();

        let newFPNumber = 1;
        if (lastFocal?.id) {
            const lastNum = parseInt(String(lastFocal.id).replace("FP", ""), 10);
            if (!Number.isNaN(lastNum)) newFPNumber = lastNum + 1;
        }
        const newFocalPersonID = "FP" + String(newFPNumber).padStart(3, "0");

        // Create Focal Person from registration
        const focalEntity = focalRepo.create({
            id: newFocalPersonID,
            // keep first/last names separate
            firstName: registration.firstName,
            lastName: registration.lastName,

            email: registration.email || null,
            contactNumber: registration.phoneNumber || null,
            password: registration.password, // already hashed at registration time

            // store location stringified
            address: registration.location || null,

            // alternative focal person fields
            altFirstName: registration.altFirstName || null,
            altLastName: registration.altLastName || null,
            altContactNumber: registration.altPhoneNumber || null,

            // photos
            ...(registration.photo ? { photo: registration.photo } : {}),
            ...(registration.altPhoto ? { alternativeFPImage: registration.altPhoto } : {}),

            archived: false,
        });
        const savedFocal = await focalRepo.save(focalEntity);

        // Generate Neighborhood ID (N001…)
        const lastNeighborhood = await neighborhoodRepo
            .createQueryBuilder("n")
            .orderBy("n.id", "DESC")
            .getOne();

        let newNbrNumber = 1;
        if (lastNeighborhood?.id) {
            const lastNum = parseInt(String(lastNeighborhood.id).replace("N", ""), 10);
            if (!Number.isNaN(lastNum)) newNbrNumber = lastNum + 1;
        }
        const newNeighborhoodID = "N" + String(newNbrNumber).padStart(3, "0");

        // Hazards JSON (support both hazardsJson and hazards string)
        let hazardsString = null;
        if (registration.hazardsJson) {
            hazardsString = registration.hazardsJson;
        } else if (registration.hazards) {
            // if it was stored as CSV or array string earlier
            try { hazardsString = JSON.stringify(JSON.parse(registration.hazards)); }
            catch { hazardsString = JSON.stringify(String(registration.hazards).split(",").map(s => s.trim()).filter(Boolean)); }
        }

        // Create Neighborhood linked to the focalPersonID (not registrationID)
        const neighborhoodEntity = neighborhoodRepo.create({
            id: newNeighborhoodID,
            focalPersonID: savedFocal.id,
            terminalID,

            noOfHouseholds: registration.noOfHouseholds ?? null,
            noOfResidents: registration.noOfResidents ?? null,
            floodSubsideHours: registration.floodSubsideHours ?? null,
            hazards: hazardsString,
            otherInformation: registration.otherInformation ?? null,

            archived: false,
        });
        const savedNeighborhood = await neighborhoodRepo.save(neighborhoodEntity);

        // Mark Terminal occupied
        await terminalRepo.update({ id: terminalID }, { availability: "Occupied" });

        // Invalidate terminal caches to reflect availability change immediately
        await deleteCache(`terminal:${terminalID}`);
        await deleteCache("terminals:active");
        await deleteCache("onlineTerminals");
        await deleteCache("offlineTerminals");
        await deleteCache("adminDashboardStats");
        await deleteCache("adminDashboard:aggregatedMap");

        // Delete Registration after successful transfer
        await registrationRepo.delete({ id: registration.id });

    return res.json({
        message: "Registration approved",
        focalPersonID: savedFocal.id,
        neighborhoodID: savedNeighborhood.id,
        terminalID,
        deletedRegistrationID: registrationID,
    });
});

// READ All Focal Person
const getFocalPersons = catchAsync(async (req, res, next) => {
    const cacheKey = "focalPersons:all";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const focalPersons = await focalPersonRepo.find();
    const sanitized = focalPersons.map(sanitizeFP);
    await setCache(cacheKey, sanitized, 120);
    res.json(sanitized);
});

// READ One Focal Person
const getFocalPerson = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const cacheKey = `focalPerson:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const focalPerson = await focalPersonRepo.findOne({ where: { id } });
    if (!focalPerson) {
        return next(new NotFoundError("Focal Person Not Found"));
    }

    const sanitized = sanitizeFP(focalPerson);
    await setCache(cacheKey, sanitized, 100);
    res.json(sanitized);
});

const updateFocalPhotos = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const fp = await focalPersonRepo.findOne({ where: { id } });
    if (!fp) return next(new NotFoundError("Focal Person Not Found"));

    const files = req.files || {};
    const main = files.photo?.[0];
    const alt = files.alternativeFPImage?.[0];

    console.log("Files:", req.files);
    console.log("Body:", req.body);

    if (!main && !alt) {
        return next(new BadRequestError("No files provided"));
    }

        // Track changes for logging
        const changes = [];

        // Save Buffers into BLOB 
        if (main?.buffer) {
            const hadPhoto = !!fp.photo;
            fp.photo = main.buffer;
            changes.push({
                field: "photo",
                oldValue: hadPhoto ? "Previous photo" : "No photo",
                newValue: "Updated new photo"
            });
        }
        if (alt?.buffer) {
            const hadAltPhoto = !!fp.alternativeFPImage;
            fp.alternativeFPImage = alt.buffer;
            changes.push({
                field: "alternativeFPImage",
                oldValue: hadAltPhoto ? "Previous photo" : "No photo",
                newValue: "Updated new photo"
            });
        }

        await focalPersonRepo.save(fp);

        // Log the photo changes
        if (changes.length > 0) {
            const actorID = req.user?.focalPersonID || req.user?.id || id;
            const actorRole = req.user?.role || "FocalPerson";

            await addLogs({
                entityType: "FocalPerson",
                entityID: id,
                changes,
                actorID,
                actorRole,
            });
        }

        // Invalidate 
        await deleteCache(`focalPerson:${id}`);
        await deleteCache("focalPersons:all");
        await deleteCache(`focalPhoto:${id}`);
        await deleteCache(`focalAltPhoto:${id}`);

    // Do not include raw blobs in JSON response
    return res.json({ message: "Focal Person Photos Updated", id: fp.id });
});


// Stream Main Photo (Blob) to Client
const getFocalPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `focalPhoto:${id}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            res.setHeader("Content-Type", "application/octet-stream");
            return res.send(Buffer.from(cached, "base64"));
        }

        const fp = await focalPersonRepo.findOne({ where: { id } });
        if (!fp || !fp.photo) return res.status(404).send("Photo Not Found");

        // Without a mime column, fallback to a generic type
        await setCache(cacheKey, Buffer.from(fp.photo).toString("base64"), 86400);
        res.setHeader("Content-Type", "application/octect-stream");
        return res.send(fp.photo);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Server Error");
    }
};


// Stream Alt Photo
const getAlternativeFocalPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `focalAltPhoto:${id}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            res.setHeader("Content-Type", "application/octet-stream");
            return res.send(Buffer.from(cached, "base64"));
        }
        const fp = await focalPersonRepo.findOne({ where: { id } });
        if (!fp || !fp.alternativeFPImage) return res.status(404).send("Alternative Photo Not Found");

        await setCache(cacheKey, Buffer.from(fp.alternativeFPImage).toString("base64"), 86400);
        res.setHeader("Content-Type", "application/octet-stream");
        return res.send(fp.alternativeFPImage);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Server Error");
    }
};

// DELETE Focal Person Photo
const deleteFocalPhoto = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const fp = await focalPersonRepo.findOne({ where: { id } });
    if (!fp) return next(new NotFoundError("Focal Person Not Found"));

        // Only log if photo actually exists
        if (fp.photo) {
            fp.photo = null;
            await focalPersonRepo.save(fp);

            // Log the deletion
            const actorID = req.user?.focalPersonID || req.user?.id || id;
            const actorRole = req.user?.role || "FocalPerson";

            await addLogs({
                entityType: "FocalPerson",
                entityID: id,
                changes: [{
                    field: "photo",
                    oldValue: "Previous photo",
                    newValue: "Removed photo"
                }],
                actorID,
                actorRole,
            });
        }

        // Invalidate cache
        await deleteCache(`focalPerson:${id}`);
        await deleteCache("focalPersons:all");
        await deleteCache(`focalPhoto:${id}`);

    return res.json({ message: "Focal person photo deleted successfully" });
});

// UPDATE Focal Person Info
const updateFocalPerson = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, contactNumber, alternativeFP, alternativeFPContactNumber, firstName, lastName, email } = req.body;

    const focalPerson = await focalPersonRepo.findOne({ where: { id } });
    if (!focalPerson) {
        return next(new NotFoundError("Focal Person Not Found"));
    }

        // Take snapshot BEFORE changes
        const fpBefore = { ...focalPerson };

        if (name) focalPerson.name = name;
        if (contactNumber) focalPerson.contactNumber = contactNumber;
        if (alternativeFP) focalPerson.alternativeFP = alternativeFP;
        if (alternativeFPContactNumber) focalPerson.alternativeFPContactNumber = alternativeFPContactNumber;
        if (firstName !== undefined) focalPerson.firstName = firstName;
        if (lastName !== undefined) focalPerson.lastName = lastName;
        if (email !== undefined) focalPerson.email = email;

        await focalPersonRepo.save(focalPerson);

        // Take snapshot AFTER changes
        const fpAfter = { ...focalPerson };

        // Log the changes
        const actorID = req.user?.focalPersonID || req.user?.id || id;
        const actorRole = req.user?.role || "FocalPerson";

        const changes = diffFields(fpBefore, fpAfter, [
            "firstName", "lastName", "contactNumber", "email"
        ]);

        if (changes.length > 0) {
            await addLogs({
                entityType: "FocalPerson",
                entityID: id,
                changes,
                actorID,
                actorRole,
            });

            // If dispatcher/admin made changes, also log to admin logs
            if (req.user?.role === "dispatcher" || req.user?.role === "admin") {
                await addAdminLog({
                    action: "edit",
                    entityType: "FocalPerson",
                    entityID: id,
                    entityName: `${focalPerson.firstName || ''} ${focalPerson.lastName || ''}`.trim(),
                    changes,
                    dispatcherID: req.user.id,
                    dispatcherName: req.user.name
                });
            }
        }

        // Invalidate
        await deleteCache(`focalPerson:${id}`);
        await deleteCache("focalPersons:all");
        await deleteCache("adminDashboard:aggregatedMap");

    res.json({ message: "Focal Person Updated", focalPerson });
});

// UPDATE Password
const changePassword = catchAsync(async (req, res, next) => {
        const isSelfRoute = req.path.includes("/me/");
        const actorId = req.user?.id;
        if (!actorId) return res.status(401).json({ message: "Unauthorized" });

        const { currentPassword, newPassword } = req.body || {};
        if (!newPassword) return res.status(400).json({ message: "New password is required" });

        let targetId = actorId;

        if (!isSelfRoute && req.params?.id) {
            const role = req.user?.role || "";
            const isPrivileged = ["admin", "dispatcher"].includes(role.toLowerCase());
            if (!isPrivileged) return res.status(403).json({ message: "Forbidden" });
            targetId = req.params.id;
        } else {
            if (!currentPassword) return res.status(400).json({ message: "Current password is required" });
        }

        const focal = await focalPersonRepo.findOne({ where: { id: targetId } });
        if (!focal) return res.status(404).json({ message: "Focal person not found" });

        if (isSelfRoute) {
            const ok = await bcrypt.compare(String(currentPassword || ""), focal.password || "");
            if (!ok) return res.status(400).json({ message: "Current password is incorrect" });
        }

        const hashed = await bcrypt.hash(String(newPassword), 10);
        await focalPersonRepo.update({ id: targetId }, { password: hashed });

        // Log the password change
        const actorID = req.user?.focalPersonID || req.user?.id || targetId;
        const actorRole = req.user?.role || "FocalPerson";

        await addLogs({
            entityType: "FocalPerson",
            entityID: targetId,
            changes: [{
                field: "password",
                oldValue: "Previous password",
                newValue: "Updated password"
            }],
            actorID,
            actorRole,
        });

        return res.json({ message: "Password updated" });
});

module.exports = {
    createFocalPerson,
    getFocalPersons,
    getFocalPerson,
    updateFocalPerson,
    updateFocalPhotos,
    getFocalPhoto,
    getAlternativeFocalPhoto,
    deleteFocalPhoto,
    changePassword,
    approveFocalRegistration,
    checkDatabaseConfig,
};
