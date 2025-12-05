const { AppDataSource } = require("../config/dataSource");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();
const SibApiV3Sdk = require('sib-api-v3-sdk');
const brevoClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = brevoClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const brevoEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const passwordResetRepo = AppDataSource.getRepository("ResetPassword");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const focalPersonRepo = AppDataSource.getRepository("FocalPerson");
const adminRepo = AppDataSource.getRepository("Admin")

// Configuration Constants
const RESET_CODE_EXP_MINUTES = 5; 
const MAX_CODE_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

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

// Utility: Mask email for UI feedback (e.g., j***@domain.com)
function maskEmail(email = "") {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    if (local.length <= 1) return `*@${domain}`;
    return `${local[0]}***@${domain}`;
}

// Utility: Build uniform reset request success payload (Option A)
function buildResetRequestResponse({ user, message }) {
    return {
        success: true,
        message: message || 'Reset code dispatched',
        userID: user.id,
        expiresInMinutes: RESET_CODE_EXP_MINUTES,
        maskedEmail: maskEmail(user.email || ''),
    };
}

// Utility: Remove existing reset entries for use (avoid multiple valid codes)
async function clearPreviousResetEntries(userID) {
    try { await passwordResetRepo.delete({userID}); } catch {}
}

// Utility: Create & Persist New Reset Entry
async function createResetEntry({userID, userType}) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + RESET_CODE_EXP_MINUTES * 60 * 1000);
    const resetEntry = passwordResetRepo.create({
        userID,
        userType: userType.toLowerCase(),
        code,
        expiry,
        failedAttempts: 0,
        lockUntil: null,
    });
    await passwordResetRepo.save(resetEntry);
    return {code, resetEntry};
}

// Utility: Send Email via Brevo
async function sendResetEmail({to, code}) {
    if (!to) return;
    const sender = {email: process.env.EMAIL_USER, name: 'ResQWave'};
    const receivers = [{email: to}];
    await brevoEmailApi.sendTransacEmail({
        sender,
        to: receivers,
        subject: 'ResQWave Password Reset',
        htmlContent: `
            <p>Your password reset code is: </p>
            <h2 style="letter-spacing:3px; color:#2563eb">${code}</h2>
            <p>This code will expire in ${RESET_CODE_EXP_MINUTES} minutes.</p>
            <p>If you did not request this, you can ignore this email.</p>
            <p>Thank you, <br/>ResQWave Team </p>
            `,
    });
}

// Step 1: Request Reset (Admin | Dispatcher)
const requestAdminDispatcherReset = async (req, res) => {
    try {
        const {emailOrNumber} = req.body;
        const identifier = String(emailOrNumber || "").trim();

        if (!identifier) {
            return res.status(400).json({message: "Email or Contact Number is Required"});
        }

        // Try Admin By Email First
        let user = await adminRepo.findOne({where: {email: identifier} });
        let userType = user ? 'admin' : null;

        if (!user) {
          user = await dispatcherRepo.findOne({ where: [{ email: identifier }, { contactNumber: identifier }] });
          if (user) userType = 'dispatcher';
        }

        if (!user) {
            // Enumeration protection could return generic success; Option A chosen so we return 404
            return res.status(404).json({ success: false, message: "User Not Found" });
        }
        // Clear previous entries & create new one
        await clearPreviousResetEntries(user.id);
        const { code } = await createResetEntry({ userID: user.id, userType });

        // Send via Brevo
        try {
          await sendResetEmail({ to: user.email, code });
        } catch (e) {
          console.error('[PasswordReset] Failed sending email via Brevo:', e);
          return res.status(500).json({ message: 'Failed to send reset email' });
        }

        console.log(`Reset Code for ${userType} (${user.id}): ${code}`);
        res.json(buildResetRequestResponse({ user, message: 'Reset code sent to your registered email' }));
    } catch (err) {
        console.error(err) 
            res.status(500).json({message: "Server Error"});
    }
};

const requestFocalReset = async(req, res) => {
    try {
        const { emailOrNumber } = req.body;
        const identifier = String(emailOrNumber || "").trim();

        if (!identifier) {
            return res.status(400).json({ message: "Email or contact number is required" });
        }

        const focal = await focalPersonRepo.findOne({ where: [{email: identifier}, {contactNumber: identifier}]});

        if (!focal) {
            return res.status(404).json({ success: false, message: "User Not Found" });
        }

        await clearPreviousResetEntries(focal.id);
        const { code } = await createResetEntry({ userID: focal.id, userType: 'focal' });
        try {
            await sendResetEmail({ to: focal.email, code });
        } catch (e) {
            console.error('[PasswordReset] Failed sending email via Brevo:', e);
            return res.status(500).json({ message: 'Failed to send reset email' });
        }
        console.log(`Reset code for focal (${focal.id}): ${code}`);
        res.json(buildResetRequestResponse({ user: focal, message: 'Reset code sent to your registered email.' }));
    } catch (err) {
        console.error(err);
        res.status(500).json({message: "Server Error"});
    }
};

const verifyResetCode = async(req, res) => {
    try {
        const {userID, code} = req.body;
        if (!userID | !code) return res.status(400).json({message: 'userID and Code are required'});

        // Fetch latest reset entry for user
        const resetEntry = await passwordResetRepo.findOne({where: {userID} });
        if (!resetEntry) return res.status(400).json({message: 'No active reset session'});

        // Check if code matches
        if (resetEntry.code !== code) {
            return res.status(400).json({
                message: 'Invalid code. Please try again.'
            });
        }

        // Code is correct - now check if expired
        if (resetEntry.expiry && new Date() > new Date(resetEntry.expiry)) {
            return res.status(400).json({
                message: 'Code has expired. Please request a new one.',
                expired: true
            });
        }

        // Success: Code is correct and not expired
        res.json({message: 'Code Verified. You may reset your password.'});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: "Server Error"});
    }
};

const resetPassword = async (req, res) => {
  try {
    const { userID, code, newPassword } = req.body;

        // Get reset entry by userID
        const resetEntry = await passwordResetRepo.findOne({ where: { userID } });
        if (!resetEntry) return res.status(400).json({ message: 'No active reset session' });

        // Check code
        if (resetEntry.code !== code) {
            return res.status(400).json({ message: 'Invalid Code' });
        }

    // Check expiry
    if (new Date() > resetEntry.expiry) {
      return res.status(400).json({ message: "Code Expired" });
    }

    const userType = resetEntry.userType.toLowerCase();

        let repo;
        switch (userType) {
            case 'focal': repo = focalPersonRepo; break;
            case 'dispatcher': repo = dispatcherRepo; break;
            case 'admin': repo = adminRepo; break;
            default: return res.status(400).json({ message: 'Invalid user type' });
        }

    const user = await repo.findOne({ where: { id: userID } });
    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

        // Enforce password policy
        const policyErrors = validatePassword(newPassword || '');
        if (policyErrors.length) {
            return res.status(400).json({ message: 'Password does not meet policy', errors: policyErrors });
        }

        user.password = await bcrypt.hash(newPassword, 10); 
    await repo.save(user);
    await passwordResetRepo.remove(resetEntry);

        res.json({ message: 'Password Reset Successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};


module.exports = {
    requestAdminDispatcherReset,
    requestFocalReset,
    verifyResetCode,
    resetPassword
}

