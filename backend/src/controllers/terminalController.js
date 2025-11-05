const { AppDataSource } = require("../config/dataSource");
const terminalRepo = AppDataSource.getRepository("Terminal");
// removed unused communityGroupRepo variable
const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");
const {
    getCache,
    setCache,
    deleteCache
} = require("../config/cache");

// Get next terminal ID (for frontend preview)
const getNextTerminalId = async (req, res) => {
    try {
        // Generate next terminal ID (same logic as create)
        const lastTerminal = await terminalRepo
            .createQueryBuilder("terminal")
            .orderBy("terminal.id", "DESC")
            .getOne();

        let newNumber = 1;
        if (lastTerminal) {
            const lastNumber = parseInt(lastTerminal.id.replace("RESQWAVE", ""), 10);
            newNumber = lastNumber + 1;
        }

        const nextID = "RESQWAVE" + String(newNumber).padStart(3, "0");

        res.json({ nextId: nextID });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - GET Next Terminal ID" });
    }
};

// CREATE Terminal
const createTerminal = async (req, res) => {
    try {
        const { name } = req.body;

        // Validate Terminal Name
        if (!name) {
            return res.status(400).json({ message: "Terminal name is required" });
        }

        // Generate Specific UID
        const lastTerminal = await terminalRepo
            .createQueryBuilder("terminal")
            .orderBy("terminal.id", "DESC")
            .getOne();

        let newNumber = 1;
        if (lastTerminal) {
            const lastNumber = parseInt(lastTerminal.id.replace("RESQWAVE", ""), 10);
            newNumber = lastNumber + 1;
        }

        const newID = "RESQWAVE" + String(newNumber).padStart(3, "0");

        const terminal = terminalRepo.create({
            id: newID,
            name,
            status: "Offline",
        });

        await terminalRepo.save(terminal);

        // Invalidate
        await deleteCache("terminals:active");
        await deleteCache("onlineTerminals");
        await deleteCache("offlineTerminals");
        await deleteCache("terminals:archived");

        res.status(201).json({ message: "Terminal Created", terminal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - CREATE Terminal" });
    }
};

// READ All Terminal
const getTerminals = async (req, res) => {
    try {
        const cacheKey = "terminals:active";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        // Fetch only active terminals
        const terminals = await terminalRepo.find({
            where: { archived: false },
        });

        await setCache(cacheKey, terminals, 60);
        res.json(terminals);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - READ Active Terminals" });
    }
};


// READ All (Active Only)
const getOnlineTerminals = async (req, res) => {
    try {
        const cacheKey = "onlineTerminals";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        // Fetch only the selected columns
        const terminals = await terminalRepo.find({
            where: { status: "Online" },
            select: ["id", "dateCreated", "status", "availability", "name"],
        });

        await setCache(cacheKey, terminals, 300);
        res.json(terminals);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - READ Active Terminals" });
    }
};


// READ All (Offline Only)
const getOfflineTerminals = async (req, res) => {
    try {
        const cacheKey = "offlineTerminals";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const terminals = await terminalRepo.find({
            where: { status: "Offline" },
            select: ["id", "dateCreated", "status", "availability", "name"],
        });

        await setCache(cacheKey, terminals, 300);
        res.json(terminals);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - READ Offline Terminals" });
    }
};

// GET Terminals for Map (with neighborhood and focal person data)
const getTerminalsForMap = async (req, res) => {
    try {
        const cacheKey = "terminals:map";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        // Get all active terminals
        const terminals = await terminalRepo.find({
            where: { archived: false },
            select: ["id", "name", "status", "dateCreated"],
        });

        // For each terminal, find associated neighborhood and focal person
        const mapData = await Promise.all(
            terminals.map(async (terminal) => {
                // Find neighborhood linked to this terminal
                const neighborhood = await neighborhoodRepo.findOne({
                    where: { terminalID: terminal.id, archived: false },
                });

                if (!neighborhood || !neighborhood.focalPersonID) {
                    return null; // Skip terminals without linked neighborhood/focal person
                }

                // Find focal person
                const focalPersonRepo = AppDataSource.getRepository("FocalPerson");
                const focalPerson = await focalPersonRepo.findOne({
                    where: { id: neighborhood.focalPersonID, archived: false },
                    select: ["id", "address", "createdAt"],
                });

                if (!focalPerson || !focalPerson.address) {
                    return null; // Skip if no focal person or address
                }

                // Parse address JSON to get coordinates
                let coordinates = null;
                try {
                    const addressData = typeof focalPerson.address === "string"
                        ? JSON.parse(focalPerson.address)
                        : focalPerson.address;

                    if (addressData.lat && addressData.lng) {
                        // Convert from [lat, lng] to [lng, lat] for Mapbox
                        coordinates = [addressData.lng, addressData.lat];
                    }
                } catch (err) {
                    console.error(`Failed to parse address for focal person ${focalPerson.id}:`, err);
                    return null;
                }

                if (!coordinates) {
                    return null; // Skip if no valid coordinates
                }

                // Format the address string (without coordinates)
                let addressString = "";
                try {
                    const addressData = typeof focalPerson.address === "string"
                        ? JSON.parse(focalPerson.address)
                        : focalPerson.address;
                    addressString = addressData.address || "—";
                } catch {
                    addressString = "—";
                }

                // Format date
                const dateRegistered = focalPerson.createdAt
                    ? new Date(focalPerson.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    })
                    : "—";

                return {
                    type: "Feature",
                    properties: {
                        status: terminal.status.toLowerCase(), // "online" or "offline"
                        name: terminal.name,
                        address: addressString,
                        date: dateRegistered,
                    },
                    geometry: {
                        type: "Point",
                        coordinates: coordinates, // [lng, lat]
                    },
                };
            })
        );

        // Filter out null entries
        const features = mapData.filter((item) => item !== null);

        const geoJSON = {
            type: "FeatureCollection",
            features: features,
        };

        await setCache(cacheKey, geoJSON, 300); // Cache for 5 minutes
        res.json(geoJSON);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - GET Terminals for Map" });
    }
};

// READ One Terminal
const getTerminal = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `terminal:${id}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const terminal = await terminalRepo.findOne({ where: { id } });
        if (!terminal) {
            return res.status(404).json({ message: "Terminal Not Found" });
        }

        await setCache(cacheKey, terminal, 300);
        res.json(terminal)
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - READ Terminal" });
    }
};

// UPDATE Terminal
const updateTerminal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, name } = req.body;

        const terminal = await terminalRepo.findOne({ where: { id } });
        if (!terminal) {
            return res.status(404).json({ message: "Terminal Not Found" });
        }

        if (status) terminal.status = status;
        if (name) terminal.name = name;

        await terminalRepo.save(terminal);

        // Invalidate
        await deleteCache(`terminal:${id}`);
        await deleteCache("terminals:active")
        await deleteCache("onlineTerminals");
        await deleteCache("offlineTerminals");
        await deleteCache("terminals:archived");

        res.json({ message: "Terminal Updated", terminal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - UPDATE Terminal" });
    }
}

// ARCHIVED Terminal
const archivedTerminal = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the terminal
        const terminal = await terminalRepo.findOne({ where: { id } });
        if (!terminal) {
            return res.status(404).json({ message: "Terminal Not Found" });
        }

        // Check if terminal is linked to an ACTIVE (non-archived) neighborhood
        const activeNeighborhood = await neighborhoodRepo.findOne({
            where: { terminalID: id, archived: false }
        });

        if (activeNeighborhood) {
            return res.status(400).json({
                message: "Cannot archive: Terminal is currently assigned to an active neighborhood. Please archive the neighborhood first or detach the terminal."
            });
        }

        // Archive the terminal
        terminal.archived = true;
        terminal.availability = "Available"; // Make it available again
        await terminalRepo.save(terminal);

        // If terminal is linked to an archived neighborhood, detach it
        const archivedNeighborhood = await neighborhoodRepo.findOne({
            where: { terminalID: id, archived: true }
        });
        if (archivedNeighborhood) {
            archivedNeighborhood.terminalID = null; // Detach terminal
            await neighborhoodRepo.save(archivedNeighborhood);
        }

        // Invalidate cache
        await deleteCache("terminals:active");
        await deleteCache("onlineTerminals");
        await deleteCache("offlineTerminals");
        await deleteCache("terminals:archived");

        res.json({ message: "Terminal Archived and Now Available" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - ARCHIVE Terminal" });
    }
};

// Unarchived Terminal
const unarchiveTerminal = async (req, res) => {
    try {
        const { id } = req.params;

        const terminal = await terminalRepo.findOne({ where: { id } });
        if (!terminal) {
            return res.status(404).json({ message: "Terminal Not Found" });
        }
        if (!terminal.archived) {
            return res.status(400).json({ message: "Terminal is not archived" });
        }

        // Unarchive and make available
        // Not automatically attach to any neighborhood
        terminal.archived = false,
            terminal.availability = "Available";
        terminal.status = terminal.status;

        await terminalRepo.save(terminal);

        //Cache
        await deleteCache("terminals:active");
        await deleteCache("onlineTerminals");
        await deleteCache("offlineTerminals");
        await deleteCache("terminals:archived");

        return res.json({ message: "Terminal Unarchived and Available" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server Error" });
    }
};


// READ Archived Terminal
const getArchivedTerminals = async (req, res) => {
    try {
        const cacheKey = "terminals:archived";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const terminals = await terminalRepo.find({ where: { archived: true } });

        await setCache(cacheKey, terminals, 300);
        res.json(terminals);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error - GET ARCHIVED Terminal" });
    }
};

// PERMANENT DELETE Terminal (only for archived terminals)
const permanentDeleteTerminal = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the terminal
        const terminal = await terminalRepo.findOne({ where: { id } });
        if (!terminal) {
            return res.status(404).json({ message: "Terminal Not Found" });
        }

        // Only allow permanent deletion of archived terminals
        if (!terminal.archived) {
            return res.status(400).json({
                message: "Terminal must be archived before permanent deletion"
            });
        }

        // Check if terminal is linked to an ACTIVE (non-archived) neighborhood
        const activeNeighborhood = await neighborhoodRepo.findOne({
            where: { terminalID: id, archived: false }
        });

        if (activeNeighborhood) {
            return res.status(400).json({
                message: "Cannot permanently delete: Terminal is currently assigned to an active neighborhood. Please archive the neighborhood first or detach the terminal."
            });
        }

        // Delete related alerts automatically (no need for force parameter)
        const alertRepo = AppDataSource.getRepository("Alert");
        const relatedAlerts = await alertRepo.find({ where: { terminalID: id } });
        let deletedAlertsCount = 0;

        if (relatedAlerts.length > 0) {
            await alertRepo.remove(relatedAlerts);
            deletedAlertsCount = relatedAlerts.length;
            console.log(`Cascade deleted ${deletedAlertsCount} alerts for terminal ${id}`);
        }

        // If terminal is linked to an archived neighborhood, detach it
        const archivedNeighborhood = await neighborhoodRepo.findOne({
            where: { terminalID: id, archived: true }
        });
        if (archivedNeighborhood) {
            archivedNeighborhood.terminalID = null; // Detach terminal
            await neighborhoodRepo.save(archivedNeighborhood);
        }

        // Permanently delete the terminal from database
        await terminalRepo.remove(terminal);

        // Invalidate cache
        await deleteCache("terminals:active");
        await deleteCache("onlineTerminals");
        await deleteCache("offlineTerminals");
        await deleteCache("terminals:archived");

        res.json({
            message: "Terminal Permanently Deleted",
            deletedAlerts: deletedAlertsCount
        });
    } catch (err) {
        console.error("Error in permanentDeleteTerminal:", err);
        res.status(500).json({
            message: "Server Error - PERMANENT DELETE Terminal",
            error: err.message
        });
    }
};

module.exports = {
    createTerminal,
    getNextTerminalId,
    getOnlineTerminals,
    getOfflineTerminals,
    getTerminals,
    getTerminal,
    updateTerminal,
    archivedTerminal,
    unarchiveTerminal,
    getArchivedTerminals,
    permanentDeleteTerminal,
    getTerminalsForMap
};