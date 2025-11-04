const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../config/dataSource");

const registrationRepo = AppDataSource.getRepository("FocalPersonRegistration");

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
    return age;
}

const submitFocalRegistration = async (req, res) => {
  try {
    const {
      regToken,
      phoneNumber,
      email,
      firstName,
      lastName,
      dateOfBirth,
      password,
      location,
      altFirstName,
      altLastName,
      altPhoneNumber,
      noOfHouseholds,
      noOfResidents,
      floodSubsideHours,
      hazards,
      otherInformation,
    } = req.body || {};

    if (!regToken) return res.status(401).json({ message: "Verification Required" });

    let decoded;
    try {
      decoded = jwt.verify(regToken, process.env.JWT_SECRET);
      if (decoded.purpose !== "focal-register") return res.status(401).json({ message: "Invalid Verification" });
    } catch {
      return res.status(401).json({ message: "Invalid or Expired Verification" });
    }

    // Use the token contact to fill whichever field is missing
    const tokenContact = decoded.contact;
    let finalEmail = email || null;
    let finalPhoneNumber = phoneNumber || null;
    if (tokenContact) {
      if (String(tokenContact).includes("@")) {
        if (!finalEmail) finalEmail = tokenContact;
      } else {
        if (!finalPhoneNumber) finalPhoneNumber = tokenContact;
      }
    }

    // Validate
    if (!firstName || !lastName) return res.status(400).json({ message: "First and Last Name are required" });
    if (!finalPhoneNumber && !finalEmail) return res.status(400).json({ message: "Phone Number or Email is required" });
    if (!password) return res.status(400).json({ message: "Password is required" });
    if (location == null || location === "") return res.status(400).json({ message: "Location is required" });
    if (noOfHouseholds == null || noOfResidents == null) {
      return res.status(400).json({ message: "Households and Residents are required" });
    }

    const primaryPhotoFile = req.files?.photo?.[0];
    const alternatePhotoFile = req.files?.altPhoto?.[0];

    const age = calculateAge(dateOfBirth);
    const passwordHash = await bcrypt.hash(password, 10);
    const locationString = typeof location === "object" ? JSON.stringify(location) : String(location);

    let hazardsJson = null;
    if (Array.isArray(hazards)) hazardsJson = JSON.stringify(hazards);
    else if (typeof hazards === "string" && hazards.length) {
      try { hazardsJson = JSON.stringify(JSON.parse(hazards)); }
      catch { hazardsJson = JSON.stringify(hazards.split(",").map(s => s.trim()).filter(Boolean)); }
    }

    // Generate Registration ID (R001 pattern inside controller)
    const lastRegistration = await registrationRepo
      .createQueryBuilder("reg")
      .orderBy("reg.id", "DESC")
      .getOne();

    let newNumber = 1;
    if (lastRegistration?.id) {
      const n = parseInt(String(lastRegistration.id).replace("R", ""), 10);
      if (!Number.isNaN(n)) newNumber = n + 1;
    }
    const newRegistrationID = "R" + String(newNumber).padStart(3, "0");

    const registrationRecord = registrationRepo.create({
      id: newRegistrationID,
      status: "Pending",
      phoneNumber: finalPhoneNumber,
      email: finalEmail,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || null,
      age,
      password: passwordHash,
      location: locationString,
      altFirstName: altFirstName || null,
      altLastName: altLastName || null,
      altPhoneNumber: altPhoneNumber || null,
      noOfHouseholds: noOfHouseholds || "",
      noOfResidents: noOfResidents || "",
      floodSubsideHours: floodSubsideHours || "",
      hazardsJson,
      otherInformation: otherInformation || null,
      ...(primaryPhotoFile?.buffer ? { photo: primaryPhotoFile.buffer } : {}),
      ...(alternatePhotoFile?.buffer ? { altPhoto: alternatePhotoFile.buffer } : {}),
    });

    const saved = await registrationRepo.save(registrationRecord);

    return res.status(201).json({
      message: "Registration Submitted",
      registrationID: saved.id,
      status: saved.status,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { submitFocalRegistration };