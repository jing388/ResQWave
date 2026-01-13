const { AppDataSource } = require("../config/dataSource");
const adminRepo = AppDataSource.getRepository("Admin");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const { sendVerificationEmail } = require("../utils/confirmEmail");
const { setCache, getCache, deleteCache } = require("../config/cache");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/profile");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "profile-" + req.user.id + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

// Password Policy Regex Components
const passwordPolicy = {
    minLength: 8,
    upper: /[A-Z]/,
    lower: /[a-z]/,
    digit: /[0-9]/,
    special: /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/,
};

function validatePassword(pw = "") {
    const errors = [];
    if (pw.length < passwordPolicy.minLength) errors.push(`Minimum ${passwordPolicy.minLength} characters`);
    if (!passwordPolicy.upper.test(pw)) errors.push("At least one uppercase letter");
    if (!passwordPolicy.lower.test(pw)) errors.push("At least one lowercase letter");
    if (!passwordPolicy.digit.test(pw)) errors.push("At least one number");
    if (!passwordPolicy.special.test(pw)) errors.push("At least one special character");
    return errors;
}

const getProfile = async (req, res) => {
    try {
        const { id, role } = req.user;

        if (role === "admin") {
            const admin = await adminRepo.findOne({ where: { id } });
            if (!admin) return res.status(404).json({ message: "Admin not found" });

            return res.json({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                phone: admin.contactNumber,
                passwordLastUpdated: admin.passwordLastUpdated,
            });
        } else if (role === "dispatcher") {
            const dispatcher = await dispatcherRepo.findOne({ where: { id } });
            if (!dispatcher) return res.status(404).json({ message: "Dispatcher not found" });

            return res.json({
                id: dispatcher.id,
                name: dispatcher.name,
                email: dispatcher.email,
                phone: dispatcher.contactNumber,
                passwordLastUpdated: dispatcher.passwordLastUpdated,
            });
        } else if (role === "focalPerson") {
            const focalPerson = await AppDataSource.getRepository("FocalPerson").findOne({ where: { id } });
            if (!focalPerson) return res.status(404).json({ message: "Focal Person not found" });

            return res.json({
                id: focalPerson.id,
                firstName: focalPerson.firstName,
                lastName: focalPerson.lastName,
                email: focalPerson.email,
                phone: focalPerson.contactNumber,
                passwordLastUpdated: focalPerson.passwordLastUpdated,
                photo: focalPerson.photo
            });
        } else {
            return res.status(403).json({ message: "Access denied" });
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const requestEmailChange = async (req, res) => {
    try {
        const { id, role, name } = req.user;
        const { newEmail } = req.body;

        if (!newEmail) {
            return res.status(400).json({ message: "New email is required" });
        }

        // Check if email is already in use
        const existingAdmin = await adminRepo.findOne({ where: { email: newEmail } });
        if (existingAdmin) return res.status(400).json({ message: "Email already in use" });

        const existingDispatcher = await dispatcherRepo.findOne({ where: { email: newEmail } });
        if (existingDispatcher) return res.status(400).json({ message: "Email already in use" });

        // Generate Code
        const code = crypto.randomInt(100000, 999999).toString();

        // Store in Cache (5 minutes)
        await setCache(`email_change:${id}`, { newEmail, code }, 300);

        // Send Email
        await sendVerificationEmail(newEmail, name, code);

        res.json({ message: "Verification code sent to new email" });
    } catch (error) {
        console.error("Error requesting email change:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const verifyEmailChange = async (req, res) => {
    try {
        const { id, role } = req.user;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: "Verification code is required" });
        }

        // Retrieve from Cache
        const cachedData = await getCache(`email_change:${id}`);
        if (!cachedData) {
            return res.status(400).json({ message: "Code expired or invalid request" });
        }

        if (String(cachedData.code) !== String(code)) {
            return res.status(400).json({ message: "Invalid verification code" });
        }

        // Update Email in DB
        if (role === "admin") {
            await adminRepo.update(id, { email: cachedData.newEmail });
        } else if (role === "dispatcher") {
            await dispatcherRepo.update(id, { email: cachedData.newEmail });
        }

        // Clear Cache
        await deleteCache(`email_change:${id}`);

        res.json({ message: "Email updated successfully" });
    } catch (error) {
        console.error("Error verifying email change:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const changePassword = async (req, res) => {
    try {
        const { id, role } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new password are required" });
        }

        let user;
        let repo;

        if (role === "admin") {
            repo = adminRepo;
            user = await repo.findOne({ where: { id } });
        } else if (role === "dispatcher") {
            repo = dispatcherRepo;
            user = await repo.findOne({ where: { id } });
        } else {
            return res.status(403).json({ message: "Access denied" });
        }

        if (!user) return res.status(404).json({ message: "User not found" });

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password" });
        }

        // Validate new password policy
        const policyErrors = validatePassword(newPassword);
        if (policyErrors.length > 0) {
            return res.status(400).json({ message: "Password does not meet policy", errors: policyErrors });
        }

        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordLastUpdated = new Date();
        
        await repo.save(user);

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const uploadProfilePicture = async (req, res) => {
    try {
        const { id, role } = req.user;
        
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        if (role !== "focalPerson") {
            return res.status(403).json({ message: "Access denied" });
        }

        const repo = AppDataSource.getRepository("FocalPerson");
        const user = await repo.findOne({ where: { id } });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Delete old profile picture if exists
        if (user.profilePicture) {
            const oldPath = path.join(__dirname, "..", user.profilePicture);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Update user profile with new picture path
        const relativePath = req.file.path.replace(path.join(__dirname, ".."), "");
        user.profilePicture = relativePath;
        await repo.save(user);

        // Return updated user data
        const responseData = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            contactNumber: user.contactNumber,
            passwordLastUpdated: user.passwordLastUpdated,
            photo: `/uploads/profile/${req.file.filename}` // Return relative path for frontend
        };

        res.json({ user: responseData });
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = { 
    getProfile, 
    requestEmailChange,
    verifyEmailChange,
    changePassword,
    uploadProfilePicture,
    upload // Export multer middleware for route
};
