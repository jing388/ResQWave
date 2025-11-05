// Upload alternative focal person photo
const uploadAltFocalPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || {};
    const altPhotoFile = files.alternativeFPImage?.[0];
    if (!altPhotoFile) return res.status(400).json({ message: "No file uploaded" });

    const neighborhood = await neighborhoodRepo.findOne({ where: { id } });
    if (!neighborhood) return res.status(404).json({ message: "Neighborhood Not Found" });
    if (!neighborhood.focalPersonID) return res.status(400).json({ message: "No focal person linked" });

    const focal = await focalPersonRepo.findOne({ where: { id: neighborhood.focalPersonID } });
    if (!focal) return res.status(404).json({ message: "Focal Person Not Found" });

    // Take snapshot before update for logging
    const fpBefore = { ...focal };

    focal.alternativeFPImage = altPhotoFile.buffer;
    await focalPersonRepo.save(focal);

    // Log the photo change
    const actorID = req.user?.focalPersonID || req.user?.id || neighborhood.focalPersonID || null;
    const actorRole = req.user?.role || "FocalPerson";

    await addLogs({
      entityType: "FocalPerson",
      entityID: neighborhood.focalPersonID,
      changes: [{
        field: "alternativeFPImage",
        oldValue: fpBefore.alternativeFPImage ? "Previous photo" : "No photo",
        newValue: "Updated new photo"
      }],
      actorID,
      actorRole,
    });

    return res.json({ message: "Alternative focal person photo uploaded" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - UPLOAD Alt Focal Photo" });
  }
};

// Get alternative focal person photo (returns image blob)
const getAltFocalPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const neighborhood = await neighborhoodRepo.findOne({ where: { id } });
    if (!neighborhood) return res.status(404).json({ message: "Neighborhood Not Found" });
    if (!neighborhood.focalPersonID) return res.status(400).json({ message: "No focal person linked" });

    const focal = await focalPersonRepo.findOne({ where: { id: neighborhood.focalPersonID } });
    if (!focal || !focal.alternativeFPImage) return res.status(404).json({ message: "No alternative focal person photo found" });

    // Default to jpeg, but you may want to store mimetype in DB for production
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", "inline; filename=alt-focal-photo.jpg");
    return res.end(focal.alternativeFPImage);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - GET Alt Focal Photo" });
  }
};

// Delete alternative focal person photo
const deleteAltFocalPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const neighborhood = await neighborhoodRepo.findOne({ where: { id } });
    if (!neighborhood) return res.status(404).json({ message: "Neighborhood Not Found" });
    if (!neighborhood.focalPersonID) return res.status(400).json({ message: "No focal person linked" });

    const focal = await focalPersonRepo.findOne({ where: { id: neighborhood.focalPersonID } });
    if (!focal) return res.status(404).json({ message: "Focal Person Not Found" });

    // Only log if photo actually exists
    if (focal.alternativeFPImage) {
      // Take snapshot before deletion for logging
      const fpBefore = { ...focal };

      focal.alternativeFPImage = null;
      await focalPersonRepo.save(focal);

      // Log the photo deletion
      const actorID = req.user?.focalPersonID || req.user?.id || neighborhood.focalPersonID || null;
      const actorRole = req.user?.role || "FocalPerson";

      await addLogs({
        entityType: "FocalPerson",
        entityID: neighborhood.focalPersonID,
        changes: [{
          field: "alternativeFPImage",
          oldValue: "Previous photo",
          newValue: "Removed photo"
        }],
        actorID,
        actorRole,
      });
    }

    return res.json({ message: "Alternative focal person photo deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - DELETE Alt Focal Photo" });
  }
};
const { AppDataSource } = require("../config/dataSource");
const {
  getCache,
  setCache,
  deleteCache
} = require("../config/cache");
const { diffFields, addLogs, toJSONSafe } = require("../utils/logs");

const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");
const terminalRepo = AppDataSource.getRepository("Terminal");
const focalPersonRepo = AppDataSource.getRepository("FocalPerson");

// helpers
const parseHazards = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      return Array.isArray(j) ? j : [];
    } catch {
      // CSV fallback
      return v.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
};
const stringifyHazards = (v) => {
  if (!v) return JSON.stringify([]);
  if (typeof v === "string") {
    try { JSON.parse(v); return v; } catch { /* fallthrough */ }
  }
  try { return JSON.stringify(v); } catch { return JSON.stringify([]); }
};

// VIEW Own Neighborhood (Map-ish view + cache)
const viewMapOwnNeighborhood = async (req, res) => {
  try {
    const focalPersonID = req.user?.id || req.params.focalPersonID || req.query.focalPersonID;
    if (!focalPersonID) return res.status(400).json({ message: "Missing Focal Person ID" });

    const cacheKey = `viewMap:nb:${focalPersonID}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const focal = await focalPersonRepo.findOne({ where: { id: focalPersonID } });
    if (!focal) return res.status(404).json({ message: "Focal Person Not Found" });

    const nb = await neighborhoodRepo.findOne({
      where: { focalPersonID, archived: false },
    });
    if (!nb) return res.status(404).json({ message: "Neighborhood Not Found" });

    const payload = {
      neighborhoodID: nb.id,
      terminalID: nb.terminalID,
      focalPerson: {
        name: [focal.firstName, focal.lastName].filter(Boolean).join(" ").trim() || focal.name || null,
        alternativeFPFirstName: focal.altFirstName || null,
        alternativeFPLastName: focal.altLastName || null,
        alternativeFPEmail: focal.altEmail || null,
        alternativeFPNumber: focal.altContactNumber || null,
        alternativeFPImage: focal.alternativeFPImage || null,
      },
      address: focal.address ?? null, // your focal has address (JSON string)
      hazards: parseHazards(nb.hazards),
      createdDate: nb.createdAt ?? null,
    };

    await setCache(cacheKey, payload, 120);
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error -- VIEW OWN Neighborhood" });
  }
};

// View Own Neighborhood (More Information)
const viewAboutYourNeighborhood = async (req, res) => {
  try {
    const focalPersonID = req.user?.id || req.params.focalPersonID || req.query.focalPersonID;
    if (!focalPersonID) return res.status(400).json({ message: "Missing Focal Person ID" });

    const focal = await focalPersonRepo.findOne({ where: { id: focalPersonID } });
    if (!focal) return res.status(404).json({ message: "Focal Person Not Found" });

    const nb = await neighborhoodRepo.findOne({
      where: { focalPersonID, archived: false },
    });
    if (!nb) return res.status(404).json({ message: "Neighborhood Not Found" });

    const payload = {
      neighborhoodID: nb.id,
      terminalID: nb.terminalID,
      noOfHouseholds: nb.noOfHouseholds || '',
      noOfResidents: nb.noOfResidents || '',
      floodwaterSubsidenceDuration: nb.floodSubsideHours || '',
      hazards: parseHazards(nb.hazards),
      otherInformation: nb.otherInformation ?? null,
      focalPerson: {
        name: [focal.firstName, focal.lastName].filter(Boolean).join(" ").trim() || focal.name || null,
        number: focal.contactNumber || null,
        email: focal.email || null,
        photo: focal.photo || null,
        alternativeFPFirstName: focal.altFirstName || null,
        alternativeFPLastName: focal.altLastName || null,
        alternativeFPEmail: focal.altEmail || null,
        alternativeFPNumber: focal.altContactNumber || null,
        alternativeFPImage: focal.alternativeFPImage || null,
      },
      address: focal.address ?? null,
      createdDate: nb.createdAt ?? null,
      updatedDate: nb.updatedAt ?? null,
    }

    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error -- VIEW OWN Neighborhood (More)" });
  }
};

// VIEW Other Neighborhoods (focal person sees limited fields only)
const viewOtherNeighborhoods = async (req, res) => {
  try {
    const focalPersonID = req.user?.id || req.params.focalPersonID || req.query.focalPersonID;
    let ownNeighborhoodId = null;
    if (focalPersonID) {
      const nb = await neighborhoodRepo.findOne({ where: { focalPersonID } });
      ownNeighborhoodId = nb?.id || null;
    }

    // Get all neighborhoods except own, with focal person info
    const neighborhoods = await neighborhoodRepo
      .createQueryBuilder("n")
      .select(["n.id", "n.hazards", "n.createdAt", "n.focalPersonID"])
      .where("n.archived = :arch", { arch: false })
      .andWhere(ownNeighborhoodId ? "n.id <> :own" : "1=1", { own: ownNeighborhoodId })
      .getRawMany();

    // Fetch all focal persons for these neighborhoods
    const focalPersonIds = neighborhoods.map(n => n.n_focalPersonID).filter(Boolean);
    let focalPersons = [];
    if (focalPersonIds.length) {
      focalPersons = await focalPersonRepo
        .createQueryBuilder("f")
        .select(["f.id", "f.address", "f.firstName", "f.lastName"])
        .where("f.id IN (:...ids)", { ids: focalPersonIds })
        .getRawMany();
    }
    const byFocalId = {};
    focalPersons.forEach(fp => { byFocalId[fp.f_id] = fp; });

    return res.json(
      neighborhoods.map((n) => ({
        neighborhoodID: n.n_id,
        hazards: parseHazards(n.n_hazards),
        createdDate: n.n_createdAt ?? null,
        address: byFocalId[n.n_focalPersonID]?.f_address || null,
        focalPerson: byFocalId[n.n_focalPersonID]
          ? `${byFocalId[n.n_focalPersonID].f_firstName || ''} ${byFocalId[n.n_focalPersonID].f_lastName || ''}`.trim()
          : null,
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error -- VIEW OTHER Neighborhoods" });
  }
};

// READ All Neighborhoods (Active) + Cache
const getNeighborhoods = async (req, res) => {
  try {
    const cacheKey = "neighborhoods:active";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    // Include focalPersonID for later lookup
    const neighborhoods = await neighborhoodRepo
      .createQueryBuilder("n")
      .select([
        "n.id",
        "n.terminalID",
        "n.focalPersonID",
        "n.createdAt",
      ])
      .where("n.archived = :arch", { arch: false })
      .orderBy("n.createdAt", "DESC")
      .getRawMany();

    // Terminal status lookup
    const terminalIds = Array.from(new Set(neighborhoods.map(x => x.n_terminalID).filter(Boolean)));
    const terminals = terminalIds.length
      ? await terminalRepo
        .createQueryBuilder("t")
        .select(["t.id", "t.status"])
        .where("t.id IN (:...ids)", { ids: terminalIds })
        .getRawMany()
      : [];
    const byTerminal = {};
    terminals.forEach(t => (byTerminal[t.t_id] = t.t_status));

    // Focal person lookup (name, contact, address)
    const focalIds = Array.from(new Set(neighborhoods.map(x => x.n_focalPersonID).filter(Boolean)));
    const focalRows = focalIds.length
      ? await focalPersonRepo
        .createQueryBuilder("f")
        .select(["f.id", "f.firstName", "f.lastName", "f.contactNumber", "f.address"])
        .where("f.id IN (:...ids)", { ids: focalIds })
        .getRawMany()
      : [];
    const byFocal = {};
    focalRows.forEach(f => {
      byFocal[f.f_id] = {
        name: [f.f_firstName, f.f_lastName].filter(Boolean).join(" ").trim() || null,
        contactNumber: f.f_contactNumber || null,
        address: f.f_address || null,
      };
    });

    const result = neighborhoods.map(n => {
      const focal = byFocal[n.n_focalPersonID] || {};
      return {
        neighborhoodID: n.n_id,
        terminalID: n.n_terminalID, // Include terminalID in the response
        terminalStatus: byTerminal[n.n_terminalID] || (n.n_terminalID ? "unknown" : "unlinked"),
        focalPerson: focal.name || null,
        contactNumber: focal.contactNumber || null,
        address: focal.address || null,
        registeredAt: n.n_createdAt || null,
      };
    });

    await setCache(cacheKey, result, 60);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error -- ACTIVE Neighborhoods TABLE" });
  }
};

// READ One Neighborhood + Cache
const getNeighborhood = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `neighborhood:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const neighborhood = await neighborhoodRepo.findOne({ where: { id } });
    if (!neighborhood) return res.status(404).json({ message: "Neighborhood Not Found" });

    // Load focal person info (if linked)
    let focal = null;
    if (neighborhood.focalPersonID) {
      focal = await focalPersonRepo.findOne({ where: { id: neighborhood.focalPersonID } });
    }

    // present hazards as array on read and include focal person details (now with address)
    const safe = {
      ...neighborhood,
      hazards: parseHazards(neighborhood.hazards),
      focalPerson: focal
        ? {
          id: focal.id,
          firstName: focal.firstName || null,
          lastName: focal.lastName || null,
          contactNumber: focal.contactNumber || null,
          email: focal.email || null,
          photo: focal.photo || null,
          altFirstName: focal.altFirstName || null,
          altLastName: focal.altLastName || null,
          altContactNumber: focal.altContactNumber || null,
          altEmail: focal.altEmail || null,
          alternativeFPImage: focal.alternativeFPImage || null,
          address: focal.address || null,
        }
        : null,
    };

    await setCache(cacheKey, safe, 300);
    return res.json(safe);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error -- READ One Neighborhood" });
  }
};

// UPDATE Neighborhood (counts, flood hours, hazards, otherInformation)
const updateNeighborhood = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      noOfHouseholds,
      noOfResidents,
      floodSubsideHours,
      hazards,
      otherInformation,
      // focal person fields (optional)
      firstName,
      lastName,
      contactNumber,
      email,
      // alternative focal person fields (optional)
      altFirstName,
      altLastName,
      altContactNumber,
      altEmail,
    } = req.body || {};

    const photoFile = req.file || req.files?.photo?.[0];
    const altPhotoFile = req.files?.alternativeFPImage?.[0] || req.files?.altPhoto?.[0];

    const neighborhood = await neighborhoodRepo.findOne({ where: { id } });
    if (!neighborhood) return res.status(404).json({ message: "Neighborhood Not Found" });
    if (neighborhood.archived) return res.status(400).json({ message: "Cannot update archived neighborhood" });

    // Validate alternative focal person fields - all must be provided together or none
    const hasAnyAltField = altFirstName || altLastName || altContactNumber || altEmail;
    if (hasAnyAltField) {
      // If any alt field is provided, all required fields must be present and non-empty
      if (!altFirstName || !altFirstName.trim()) {
        return res.status(400).json({ message: "Alternative focal person first name is required" });
      }
      if (!altLastName || !altLastName.trim()) {
        return res.status(400).json({ message: "Alternative focal person last name is required" });
      }
      if (!altContactNumber || !altContactNumber.trim()) {
        return res.status(400).json({ message: "Alternative focal person contact number is required" });
      }
      if (!altEmail || !altEmail.trim()) {
        return res.status(400).json({ message: "Alternative focal person email is required" });
      }
    }

    // snapshots BEFORE (parse hazards to array for proper logging)
    const nbBefore = { ...neighborhood, hazards: parseHazards(neighborhood.hazards) };

    // Neighborhood updates (store as string for range support)
    if (noOfHouseholds != null && noOfHouseholds !== neighborhood.noOfHouseholds) {
      neighborhood.noOfHouseholds = noOfHouseholds;
    }
    if (noOfResidents != null && noOfResidents !== neighborhood.noOfResidents) {
      neighborhood.noOfResidents = noOfResidents;
    }
    if (floodSubsideHours != null && floodSubsideHours !== neighborhood.floodSubsideHours) {
      neighborhood.floodSubsideHours = floodSubsideHours;
    }
    if (hazards != null) {
      const incoming = stringifyHazards(hazards);
      if (incoming !== (neighborhood.hazards ?? null)) {
        neighborhood.hazards = incoming;
      }
    }
    if (otherInformation != null && String(otherInformation) !== String(neighborhood.otherInformation ?? "")) {
      neighborhood.otherInformation = otherInformation;
    }

    // Focal person updates (if linked)
    let fpBefore = null;
    let fpAfter = null;
    if (neighborhood.focalPersonID) {
      const focal = await focalPersonRepo.findOne({ where: { id: neighborhood.focalPersonID } });
      if (focal) {
        // take BEFORE snapshot first
        fpBefore = { ...focal };

        // apply only real changes
        if (firstName != null && String(firstName) !== String(focal.firstName ?? "")) focal.firstName = firstName;
        if (lastName != null && String(lastName) !== String(focal.lastName ?? "")) focal.lastName = lastName;
        if (contactNumber != null && String(contactNumber) !== String(focal.contactNumber ?? "")) focal.contactNumber = contactNumber;
        if (email != null && String(email) !== String(focal.email ?? "")) focal.email = email;
        if (altFirstName != null && String(altFirstName) !== String(focal.altFirstName ?? "")) focal.altFirstName = altFirstName;
        if (altLastName != null && String(altLastName) !== String(focal.altLastName ?? "")) focal.altLastName = altLastName;
        if (altContactNumber != null && String(altContactNumber) !== String(focal.altContactNumber ?? "")) focal.altContactNumber = altContactNumber;
        if (altEmail != null && String(altEmail) !== String(focal.altEmail ?? "")) focal.altEmail = altEmail;

        // optional photos
        const photoFile = req.file || req.files?.photo?.[0];
        const altPhotoFile = req.files?.alternativeFPImage?.[0] || req.files?.altPhoto?.[0];
        if (photoFile?.buffer) focal.photo = photoFile.buffer;
        if (altPhotoFile?.buffer) focal.alternativeFPImage = altPhotoFile.buffer;

        focal.updatedAt = new Date();
        await focalPersonRepo.save(focal);

        // AFTER snapshot
        fpAfter = { ...focal };
      }
    }

    neighborhood.updatedAt = new Date();
    await neighborhoodRepo.save(neighborhood);

    // WRITE LOGS
    const actorID = req.user?.focalPersonID || req.user?.id || neighborhood.focalPersonID || null;
    const actorRole = req.user?.role || "FocalPerson";

    // Neighborhood changes (parse hazards to array for proper logging)
    const nbAfter = { ...neighborhood, hazards: parseHazards(neighborhood.hazards) };
    const nbChanges = diffFields(nbBefore, nbAfter, [
      "noOfHouseholds", "noOfResidents", "floodSubsideHours", "hazards", "otherInformation"
    ]);
    await addLogs({
      entityType: "Neighborhood",
      entityID: id,
      changes: nbChanges,
      actorID,
      actorRole,
    });

    // Focal person changes
    if (fpBefore && fpAfter) {
      const fpChanges = diffFields(fpBefore, fpAfter, [
        "firstName", "lastName", "contactNumber", "email",
        "altFirstName", "altLastName", "altContactNumber", "altEmail"
      ]);

      if (photoFile?.buffer) {
        fpChanges.push({ field: "photo", oldValue: fpBefore.photo ? "Previous photo" : "No photo", newValue: "Updated new photo" });
      }
      if (altPhotoFile?.buffer) {
        fpChanges.push({ field: "alternativeFPImage", oldValue: fpBefore.alternativeFPImage ? "Previous photo" : "No photo", newValue: "Updated new photo" });
      }

      await addLogs({
        entityType: "FocalPerson",
        entityID: neighborhood.focalPersonID,
        changes: fpChanges,
        actorID,
        actorRole,
      });
    }

    await deleteCache(`neighborhood:${id}`);
    await deleteCache("neighborhoods:active");

    return res.json({
      message: "Neighborhood Updated",
      neighborhood: {
        ...neighborhood,
        hazards: parseHazards(neighborhood.hazards),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - UPDATE Neighborhood" });
  }
};

// ARCHIVE Neighborhood
const archivedNeighborhood = async (req, res) => {
  try {
    const { id } = req.params;

    const nb = await neighborhoodRepo
      .createQueryBuilder("n")
      .select(["n.id", "n.terminalID", "n.archived", "n.focalPersonID"])
      .where("n.id = :id", { id })
      .getRawOne();

    if (!nb) return res.status(404).json({ message: "Neighborhood Not Found" });
    if (nb.n_archived) return res.json({ message: "Neighborhood Already Archived" });

    // 1) Archive neighborhood
    await neighborhoodRepo.update({ id }, { archived: true });

    // 2) Archive focal person linked to this neighborhood (optional, mirrors community behavior)
    if (nb.n_focalPersonID) {
      await focalPersonRepo.update({ id: nb.n_focalPersonID }, { archived: true });
    }

    // 3) Free/unlink terminal
    const terminalId = nb.n_terminalID;
    if (terminalId) {
      await terminalRepo.update({ id: terminalId }, { availability: "Available" });
      await neighborhoodRepo.update({ id }, { terminalID: null });
    }

    // Invalidate all relevant caches
    await deleteCache(`neighborhood:${id}`);
    await deleteCache("neighborhoods:active");
    await deleteCache("neighborhoods:archived");

    // Invalidate terminal caches to reflect availability change immediately
    if (terminalId) {
      await deleteCache(`terminal:${terminalId}`);
      await deleteCache("terminals:active");
      await deleteCache("onlineTerminals");
      await deleteCache("offlineTerminals");
    }

    return res.json({ message: "Neighborhood Archived, Focal Person Archived, Terminal Available" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - ARCHIVED Neighborhood", error: err.message });
  }
};

// DELETE Neighborhood
const deleteNeighborhood = async (req, res) => {
  try {
    const { id } = req.params;

    const nb = await neighborhoodRepo
      .createQueryBuilder("n")
      .select(["n.id", "n.archived", "n.focalPersonID", "n.terminalID"])
      .where("n.id = :id", { id })
      .getRawOne();

    if (!nb) return res.status(404).json({ message: "Neighborhood Not Found" });
    if (!nb.n_archived) {
      return res.status(400).json({ message: "Neighborhood Must Be Archived" });
    }

    // Terminal is Unlinked and Available
    if (nb.n_terminalID) {
      await terminalRepo.update({ id: nb.n_terminalID }, { availability: "Available" });
      await neighborhoodRepo.update({ id }, { terminalID: null });
    }

    // Delete Linked Focal Person
    if (nb.n_focalPersonID) {
      await focalPersonRepo.delete({ id: nb.n_focalPersonID });
    }

    await neighborhoodRepo.delete({ id });

    // Invalidate all relevant caches
    await deleteCache(`neighborhood:${id}`);
    await deleteCache("neighborhoods:active");
    await deleteCache("neighborhoods:archived");

    // Invalidate terminal caches to reflect availability change immediately
    if (nb.n_terminalID) {
      await deleteCache(`terminal:${nb.n_terminalID}`);
      await deleteCache("terminals:active");
      await deleteCache("onlineTerminals");
      await deleteCache("offlineTerminals");
    }

    return res.json({ message: "Neighborhood permanently delete" });
  } catch (err) {
    console.error(err);
    return res.status(500).son({ message: "Server Error" });
  }
};

// GET ARCHIVED Neighborhoods + Cache
const getArchivedNeighborhoods = async (req, res) => {
  try {
    const cacheKey = "neighborhoods:archived";
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    // Include focalPersonID for later lookup (same as active neighborhoods)
    const neighborhoods = await neighborhoodRepo
      .createQueryBuilder("n")
      .select([
        "n.id",
        "n.terminalID",
        "n.focalPersonID",
        "n.createdAt",
      ])
      .where("n.archived = :arch", { arch: true })
      .orderBy("n.createdAt", "DESC")
      .getRawMany();

    // Terminal status lookup (but for archived we don't show status)
    const terminalIds = Array.from(new Set(neighborhoods.map(x => x.n_terminalID).filter(Boolean)));
    const terminals = terminalIds.length
      ? await terminalRepo
        .createQueryBuilder("t")
        .select(["t.id", "t.status"])
        .where("t.id IN (:...ids)", { ids: terminalIds })
        .getRawMany()
      : [];
    const byTerminal = {};
    terminals.forEach(t => (byTerminal[t.t_id] = t.t_status));

    // Focal person lookup (name, contact, address) - same as active neighborhoods
    const focalIds = Array.from(new Set(neighborhoods.map(x => x.n_focalPersonID).filter(Boolean)));
    const focalRows = focalIds.length
      ? await focalPersonRepo
        .createQueryBuilder("f")
        .select(["f.id", "f.firstName", "f.lastName", "f.contactNumber", "f.address"])
        .where("f.id IN (:...ids)", { ids: focalIds })
        .getRawMany()
      : [];
    const byFocal = {};
    focalRows.forEach(f => {
      byFocal[f.f_id] = {
        name: [f.f_firstName, f.f_lastName].filter(Boolean).join(" ").trim() || null,
        contactNumber: f.f_contactNumber || null,
        address: f.f_address || null,
      };
    });

    const result = neighborhoods.map(n => {
      const focal = byFocal[n.n_focalPersonID] || {};
      return {
        neighborhoodID: n.n_id,
        terminalID: n.n_terminalID, // Include terminalID in the response
        terminalStatus: "N/A", // For archived neighborhoods, no terminal status
        focalPerson: focal.name || null,
        contactNumber: focal.contactNumber || null,
        address: focal.address || null,
        registeredAt: n.n_createdAt || null,
      };
    });

    await setCache(cacheKey, result, 120);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error -- ARCHIVED Neighborhoods TABLE" });
  }
};

module.exports = {
  getNeighborhoods,
  getNeighborhood,
  viewMapOwnNeighborhood,
  viewAboutYourNeighborhood,
  viewOtherNeighborhoods,
  updateNeighborhood,
  archivedNeighborhood,
  getArchivedNeighborhoods,
  uploadAltFocalPhoto,
  getAltFocalPhoto,
  deleteAltFocalPhoto,
  deleteNeighborhood
};