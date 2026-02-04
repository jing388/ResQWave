const bcrypt = require("bcrypt");
const { AppDataSource } = require("../config/dataSource");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const {getCache, setCache, deleteCache} = require("../config/cache");
const { generateTemporaryPassword, sendTemporaryPasswordEmail } = require("../utils/passwordUtils");
const { addAdminLog } = require("../utils/adminLogs");
const catchAsync = require("../utils/catchAsync");
const { BadRequestError, NotFoundError, AppError } = require("../exceptions");

// CREATE Dispatcher
const createDispatcher = catchAsync(async (req, res) => {
    const { name, email, contactNumber } = req.body;
    const photoFile = req.file || req.files?.photo?.[0];

    // Check if the email exists
    const existingEmail = await dispatcherRepo.findOne({ where: { email } });
    if (existingEmail) {
        throw new BadRequestError("Email Already Used");
    }

    // Check if the contact number exist
    const existingNumber = await dispatcherRepo.findOne({ where: { contactNumber } });
    if (existingNumber) {
        throw new BadRequestError("Contact Number already used");
    }

    // Generate Specific UID
    const lastDispatcher = await dispatcherRepo
        .createQueryBuilder("dispatcher")
        .orderBy("dispatcher.id", "DESC")
        .getOne();

    let newNumber = 1;
    if (lastDispatcher) {
        const lastNumber = parseInt(lastDispatcher.id.replace("DSP", ""), 10);
        newNumber = lastNumber + 1;
    }

    const newID = "DSP" + String(newNumber).padStart(3, "0");

    // Generate Secure Temporary Password
    const plainPassword = generateTemporaryPassword();

    // Hash Password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const dispatcher = dispatcherRepo.create({
        id: newID,
        name,
        contactNumber,
        email,
        password: hashedPassword,
        createdBy: req.user && req.user.id ? req.user.id : null,
        ...(photoFile?.buffer ? { photo: photoFile.buffer } : {}),
    });

    await dispatcherRepo.save(dispatcher);

    // Log dispatcher creation by admin/dispatcher
    if (req.user?.role === "dispatcher" || req.user?.role === "admin") {
        await addAdminLog({
            action: "create",
            entityType: "Dispatcher",
            entityID: newID,
            entityName: name,
            dispatcherID: req.user.id,
            dispatcherName: req.user.name 
        });
    }

    // Invalidate Caches
    await deleteCache("dispatchers:active");
    await deleteCache("dispatcher:archived");
    await deleteCache("adminDashboardStats");
    await deleteCache("adminDashboard:aggregatedMap");
    await deleteCache("admin:logs:all")

    // Send Email (Fire and Forget)
    sendTemporaryPasswordEmail({
        to: email,
        name: name,
        password: plainPassword,
        role: "dispatcher",
        id: newID
    }).catch(err => {
        console.error(`Failed to send password email to ${email}:`, err);
    });

    res.status(201).json({ message: "Dispatcher Created. Password sent to email." });
});

// READ Dispatchers (Exclude Archived)
const getDispatchers = catchAsync(async (req, res) => {
    const cacheKey = "dispatchers:active";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const dispatchers = await dispatcherRepo.find({
        where: { archived: false },
        select: ["id", "name", "contactNumber", "email", "createdAt"]
    });

    await setCache(cacheKey, dispatchers, 60);
    res.json(dispatchers);
});


// READ One Dispatcher
const getDispatcher = catchAsync(async (req, res) => {
    const { id } = req.params;
    const cacheKey = `dispatcher:${id}`;

    // Check cache
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    // Fetch dispatcher (all columns)
    const dispatcher = await dispatcherRepo.findOne({ where: { id } });

    if (!dispatcher) {
        throw new NotFoundError("Dispatcher Does Not Exist");
    }

    const { ...safeData } = dispatcher;

    // Save to cache without password
    await setCache(cacheKey, safeData, 120);

    // Return the dispatcher (all info except password)
    res.json(safeData);
});



// UPDATE Dispatcher
const updateDispatcher = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, email, contactNumber, password, removePhoto } = req.body || {};
    const photoFile = req.file || req.files?.photo?.[0];

    const dispatcher = await dispatcherRepo.findOne({ where: { id } });
    if (!dispatcher) throw new NotFoundError("Dispatcher Not Found");

    // Snapshot before changes for logging
    const oldDispatcher = { ...dispatcher };

    // Uniqueness checks if changing email/contact
    if (email && email !== dispatcher.email) {
        const emailInUse = await dispatcherRepo.findOne({ where: { email } });
        if (emailInUse) throw new AppError("Email already in use", 409);
        dispatcher.email = email;
    }
    if (contactNumber && contactNumber !== dispatcher.contactNumber) {
        const numberInUse = await dispatcherRepo.findOne({ where: { contactNumber } });
        if (numberInUse) throw new AppError("Contact number already in use", 409);
        dispatcher.contactNumber = contactNumber;
    }

    if (name) dispatcher.name = name;
    if (password) {
        dispatcher.password = await bcrypt.hash(password, 10);
        dispatcher.passwordLastUpdated = new Date();
    }

    // Photo update: replace if new file; otherwise keep existing
    if (photoFile?.buffer) {
        dispatcher.photo = photoFile.buffer;
    } else if (String(removePhoto).toLowerCase() === "true") {
        dispatcher.photo = null;
    }

    await dispatcherRepo.save(dispatcher);

    // Log changes made by dispatcher/admin
    if (req.user?.role === "dispatcher" || req.user?.role === "admin") {
        const changes = [];
        if (name && name !== oldDispatcher.name) {
            changes.push({ field: "name", oldValue: oldDispatcher.name, newValue: name });
        }
        if (email && email !== oldDispatcher.email) {
            changes.push({ field: "email", oldValue: oldDispatcher.email, newValue: email });
        }
        if (contactNumber && contactNumber !== oldDispatcher.contactNumber) {
            changes.push({ field: "contactNumber", oldValue: oldDispatcher.contactNumber, newValue: contactNumber });
        }
        if (password) {
            changes.push({ field: "password", oldValue: "[hidden]", newValue: "[updated]" });
        }
        if (photoFile?.buffer) {
            changes.push({ field: "photo", oldValue: "Previous photo", newValue: "Updated photo" });
        }
        if (String(removePhoto).toLowerCase() === "true") {
            changes.push({ field: "photo", oldValue: "Previous photo", newValue: "Removed" });
        }

        if (changes.length > 0) {
            await addAdminLog({
                action: "edit",
                entityType: "Dispatcher",
                entityID: id,
                entityName: dispatcher.name,
                changes,
                dispatcherID: req.user.id,
                dispatcherName: req.user.name
            });
        }
    }

    // Invalidate
    await deleteCache("dispatchers:active");
    await deleteCache("dispatchers:archived");
    await deleteCache(`dispatcher:${id}`);

    res.json({ message: "Dispatcher Updated" });
});

// ARCHIVE/DELETE Dispatcher
const archiveDispatcher = catchAsync(async (req, res) => {
    const { id } = req.params;
    const dispatcher = await dispatcherRepo.findOne({ where: { id } });
    if (!dispatcher) {
        throw new NotFoundError("Dispatcher Not Found");
    }

    dispatcher.archived = true
    await dispatcherRepo.save(dispatcher);

    // Log archive action
    if (req.user?.role === "dispatcher" || req.user?.role === "admin") {
        await addAdminLog({
            action: "archive",
            entityType: "Dispatcher",
            entityID: id,
            entityName: dispatcher.name,
            dispatcherID: req.user.id,
            dispatcherName: req.user.name
        });
    }

    // Invalidate
    await deleteCache("dispatchers:active");
    await deleteCache("dispatchers:archived");
    await deleteCache(`dispatcher:${id}`);
    await deleteCache("adminDashboardStats");

    res.json({ message: "Dispatcher Archived" });
});

// UNARCHIVE/RESTORE Dispatcher
const unarchiveDispatcher = catchAsync(async (req, res) => {
    const { id } = req.params;
    const dispatcher = await dispatcherRepo.findOne({ where: { id } });
    if (!dispatcher) {
        throw new NotFoundError("Dispatcher Not Found");
    }

    // Check if dispatcher is actually archived
    if (!dispatcher.archived) {
        throw new BadRequestError("Dispatcher is not archived");
    }

    dispatcher.archived = false;
    await dispatcherRepo.save(dispatcher);

    // Log unarchive action
    if (req.user?.role === "dispatcher" || req.user?.role === "admin") {
        await addAdminLog({
            action: "unarchive",
            entityType: "Dispatcher",
            entityID: id,
            entityName: dispatcher.name,
            dispatcherID: req.user.id,
            dispatcherName: req.user.name
        });
    }

    // Invalidate
    await deleteCache("dispatchers:active");
    await deleteCache("dispatchers:archived");
    await deleteCache(`dispatcher:${id}`);
    await deleteCache("adminDashboardStats");

    res.json({ message: "Dispatcher Restored" });
});

// READ ARCHIVE Dispatcher
const archiveDispatchers = catchAsync(async (req, res) => {
    const cacheKey = "dispatchers:archived";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const archivedDispatchers = await dispatcherRepo.find({
        where: { archived: true },
        select: ["id", "name", "contactNumber", "email", "updatedAt", "createdAt"] // using updatedAt instead of archivedAt 
    });

    await setCache(cacheKey, archivedDispatchers, 120);
    res.json(archivedDispatchers);
});

// PERMANENT DELETE Dispatcher
const deleteDispatcherPermanently = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Check if dispatcher exists
    const dispatcher = await dispatcherRepo.findOne({ where: { id } });
    if (!dispatcher) {
        throw new NotFoundError("Dispatcher Not Found");
    }

    // Only allow permanent deletion of archived dispatchers for safety
    if (!dispatcher.archived) {
        throw new BadRequestError("Only archived dispatchers can be permanently deleted");
    }

    // Log delete action before removing
    if (req.user?.role === "dispatcher" || req.user?.role === "admin") {
        await addAdminLog({
            action: "delete",
            entityType: "Dispatcher",
            entityID: id,
            entityName: dispatcher.name,
            dispatcherID: req.user.id,
            dispatcherName: req.user.name
        });
    }

    // Permanently delete from database
    await dispatcherRepo.remove(dispatcher);

    // Invalidate caches
    await deleteCache("dispatchers:active");
    await deleteCache("dispatchers:archived");
    await deleteCache(`dispatcher:${id}`);
    await deleteCache("adminDashboardStats");

    res.json({ message: "Dispatcher Permanently Deleted" });
});


module.exports = {
    createDispatcher,
    getDispatchers,
    getDispatcher,
    updateDispatcher,
    archiveDispatcher,
    unarchiveDispatcher,
    archiveDispatchers,
    deleteDispatcherPermanently
};