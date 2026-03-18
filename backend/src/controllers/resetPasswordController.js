const { AppDataSource } = require("../config/dataSource");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();

// Fix 1: Brevo key validation
if (!process.env.BREVO_API_KEY || !process.env.EMAIL_USER) {
    throw new Error('[PasswordReset] Missing required email env vars');
}

const catchAsync = require("../utils/catchAsync");
const { NotFoundError, BadRequestError, InternalServerError } = require("../exceptions");
const { sendSMS } = require("../utils/textbeeSMS");

const passwordResetRepo = AppDataSource.getRepository("ResetPassword");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const focalPersonRepo = AppDataSource.getRepository("FocalPerson");
const adminRepo = AppDataSource.getRepository("Admin");

// Rate Limit Tracking (In-Memory per Server Node)
const userRRLimits = new Map();

// Configuration Constants
const RESET_CODE_EXP_MINUTES = 1;
const MAX_CODE_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;

// Cleanup interval for Rate Limit Map
setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW;
    userRRLimits.forEach((v, k) => {
        if (v.firstRequestTime < cutoff) userRRLimits.delete(k);
    });
}, RATE_LIMIT_WINDOW);

// Password Policy
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

function maskEmail(email = "") {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    if (local.length <= 1) return `*@${domain}`;
    return `${local[0]}***@${domain}`;
}

function maskPhone(phone = "") {
    if (!phone || phone.length <= 4) return phone;
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

function isEmail(string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(string);
}

function buildResetRequestResponse({ user, message, deliveryMethod = 'email' }) {
    return {
        success: true,
        message: message || 'Reset code dispatched',
        userID: user.id,
        expiresInMinutes: RESET_CODE_EXP_MINUTES,
        maskedContact: deliveryMethod === 'sms' ? maskPhone(user.contactNumber || '') : maskEmail(user.email || ''),
        deliveryMethod
    };
}

// Fix 3: Log the silent catch
async function clearPreviousResetEntries(userID) {
    try { 
        await passwordResetRepo.delete({ userID }); 
    } catch (e) { 
        console.error('[PasswordReset] Failed to clear reset entries:', e); 
    }
}

async function createResetEntry({ userID, userType }) {
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
    return { code, resetEntry };
}

async function sendResetEmail({ to, code, name }) {
    if (!to) return;
    const { sendEmail } = require("../utils/emailTemplate");
    await sendEmail({
        email: to,
        name: name,
        code: code,
        subject: "ResQWave Password Reset",
        title: "Password Reset",
        message: "You have requested a password reset."
    });
}

// New Utility: Extracted SMS handler
async function sendResetSMS({ to, code }) {
    if (!to) return;
    const msg = `Your ResQWave password reset code is: ${code}. It expires in ${RESET_CODE_EXP_MINUTES} minutes.`;
    await sendSMS(to, msg);
}

const requestAdminDispatcherReset = catchAsync(async (req, res, next) => {
    const { emailOrNumber } = req.body;
    const identifier = String(emailOrNumber || "").trim();

    if (!identifier) return next(new BadRequestError("Email or Contact Number is Required"));

    const isIdentifierEmail = isEmail(identifier);
    let user = await adminRepo.findOne({ where: { email: identifier } });
    let userType = user ? 'admin' : null;

    if (!user) {
        user = await dispatcherRepo.findOne({ where: [{ email: identifier }, { contactNumber: identifier }] });
        if (user) userType = 'dispatcher';
    }

    if (!user) return next(new NotFoundError("User Not Found"));

    await clearPreviousResetEntries(user.id);
    const { code } = await createResetEntry({ userID: user.id, userType });
    const deliveryMethod = isIdentifierEmail ? 'email' : 'sms';

    try {
        if (deliveryMethod === 'email') {
            await sendResetEmail({ to: user.email, code, name: user.name });
        } else {
            await sendResetSMS({ to: user.contactNumber, code });
        }
    } catch (e) {
        console.error(`[PasswordReset] Failed sending ${deliveryMethod}:`, e);
        return next(new InternalServerError(`Failed to send reset code via ${deliveryMethod}`));
    }

    res.json(buildResetRequestResponse({ 
        user, 
        message: `Reset code sent to your registered ${deliveryMethod === 'sms' ? 'phone number' : 'email'}`, 
        deliveryMethod 
    }));
});

const requestFocalReset = catchAsync(async (req, res, next) => {
    const { emailOrNumber } = req.body;
    const identifier = String(emailOrNumber || "").trim();

    if (!identifier) return next(new BadRequestError("Email or contact number is required"));

    const isIdentifierEmail = isEmail(identifier);
    const focal = await focalPersonRepo.findOne({
        where: [{ email: identifier }, { contactNumber: identifier }]
    });

    if (!focal) return next(new NotFoundError("User Not Found"));

    await clearPreviousResetEntries(focal.id);
    const { code } = await createResetEntry({ userID: focal.id, userType: 'focal' });
    const deliveryMethod = isIdentifierEmail ? 'email' : 'sms';

    try {
        if (deliveryMethod === 'email') {
            await sendResetEmail({ to: focal.email, code, name: focal.firstName ? `${focal.firstName} ${focal.lastName}` : focal.name });
        } else {
            await sendResetSMS({ to: focal.contactNumber, code });
        }
    } catch (e) {
        console.error(`[PasswordReset] Failed sending ${deliveryMethod}:`, e);
        return next(new InternalServerError(`Failed to send reset code via ${deliveryMethod}`));
    }

    res.json(buildResetRequestResponse({ 
        user: focal, 
        message: `Reset code sent to your registered ${deliveryMethod === 'sms' ? 'phone number' : 'email'}.`, 
        deliveryMethod 
    }));
});

const verifyResetCode = catchAsync(async (req, res, next) => {
    const { userID, code } = req.body;
    if (!userID || !code) return next(new BadRequestError('userID and Code are required'));

    const resetEntry = await passwordResetRepo.findOne({ where: { userID } });
    if (!resetEntry) return next(new BadRequestError('No active reset session'));

    if (resetEntry.lockUntil && new Date() < new Date(resetEntry.lockUntil)) {
        const minsLeft = Math.ceil((new Date(resetEntry.lockUntil) - new Date()) / 60000);
        return next(new BadRequestError(`Too many failed attempts. Try again in ${minsLeft} minutes.`));
    }

    if (resetEntry.code !== code) {
        resetEntry.failedAttempts = (resetEntry.failedAttempts || 0) + 1;
        let errorMessage = 'Invalid code. Please try again.';

        if (resetEntry.failedAttempts >= MAX_CODE_ATTEMPTS) {
            resetEntry.lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
            errorMessage = `Too many failed attempts. Locked for ${LOCK_DURATION_MINUTES} minutes.`;
        }
        await passwordResetRepo.save(resetEntry);
        return next(new BadRequestError(errorMessage));
    }

    if (resetEntry.expiry && new Date() > new Date(resetEntry.expiry)) {
        return next(new BadRequestError('Code has expired. Please request a new one.'));
    }

    res.json({ message: 'Code Verified. You may reset your password.' });
});

const resetPassword = catchAsync(async (req, res, next) => {
    const { userID, code, newPassword } = req.body;

    if (!userID || !code || !newPassword) {
        return next(new BadRequestError('userID, code and new password is required'));
    }

    const resetEntry = await passwordResetRepo.findOne({ where: { userID } });
    if (!resetEntry) return next(new BadRequestError('No active reset session'));

    if (resetEntry.lockUntil && new Date() < new Date(resetEntry.lockUntil)) {
        const minsLeft = Math.ceil((new Date(resetEntry.lockUntil) - new Date()) / 60000);
        return next(new BadRequestError(`Too many failed attempts. Try again in ${minsLeft} minutes.`));
    }

    if (resetEntry.code !== code) {
        resetEntry.failedAttempts = (resetEntry.failedAttempts || 0) + 1;
        let errorMessage = 'Invalid Code';

        if (resetEntry.failedAttempts >= MAX_CODE_ATTEMPTS) {
            resetEntry.lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
            errorMessage = `Too many failed attempts. Locked for ${LOCK_DURATION_MINUTES} minutes.`;
        }
        await passwordResetRepo.save(resetEntry);
        return next(new BadRequestError(errorMessage));
    }

    if (new Date() > resetEntry.expiry) return next(new BadRequestError("Code Expired"));

    const policyErrors = validatePassword(newPassword || '');
    if (policyErrors.length) {
        return next(new BadRequestError(policyErrors.join(', ')));
    }

    const userType = resetEntry.userType.toLowerCase();
    let repo;
    switch (userType) {
        case 'focal': repo = focalPersonRepo; break;
        case 'dispatcher': repo = dispatcherRepo; break;
        case 'admin': repo = adminRepo; break;
        default: return next(new BadRequestError('Invalid user type'));
    }

    const user = await repo.findOne({ where: { id: userID } });
    if (!user) return next(new NotFoundError("User Not Found"));

    user.password = await bcrypt.hash(newPassword, 10);
    if (userType === 'admin' || userType === 'dispatcher') {
        user.passwordLastUpdated = new Date();
    }
    await repo.save(user);
    await passwordResetRepo.remove(resetEntry);

    res.json({ message: 'Password Reset Successful' });
});

const resendResetCode = catchAsync(async (req, res, next) => {
    const { userID, deliveryMethod = 'email' } = req.body;

    if (!userID) return next(new BadRequestError("userID is required"));

    if(!['email', 'sms'].includes(deliveryMethod))
        return next(new BadRequestError('Invalid Delivery Method.'));

    const existing = await passwordResetRepo.findOne({ where: { userID } });
    if (!existing) return next(new BadRequestError("No active reset session."));

    if (existing.lockUntil && new Date() < new Date(existing.lockUntil)) {
        const minsLeft = Math.ceil((new Date(existing.lockUntil) - new Date()) / 60000);
        return next(new BadRequestError(`Account is locked. Try again in ${minsLeft} minutes.`));
    }

    // Rate limiting
    const now = Date.now();
    const userLimit = userRRLimits.get(userID) || { count: 0, firstRequestTime: now };
    if (now - userLimit.firstRequestTime > RATE_LIMIT_WINDOW) {
        userLimit.count = 1;
        userLimit.firstRequestTime = now;
    } else {
        userLimit.count += 1;
        if (userLimit.count > 3) {
            userRRLimits.set(userID, userLimit);
            return next(new BadRequestError("Too many resend attempts. Try again in 10 minutes."));
        }
    }
    userRRLimits.set(userID, userLimit);

    const userType = existing.userType;
    let repo;
    if (userType === 'admin') repo = adminRepo;
    else if (userType === 'dispatcher') repo = dispatcherRepo;
    else if (userType === 'focal') repo = focalPersonRepo;
    else return (next(new BadRequestError('Invalid User Session Type')));

    const user = await repo.findOne({ where: { id: userID } });
    if (!user) return next(new NotFoundError("User not found"));

    // Check availability of chosen method
    if (deliveryMethod === 'sms' && !user.contactNumber)
        return next(new BadRequestError('No phone number on this account.'));

    await clearPreviousResetEntries(user.id);
    const { code } = await createResetEntry({ userID: user.id, userType });

    try {
        if (deliveryMethod === 'sms') {
            await sendResetSMS({ to: user.contactNumber, code });
        } else {
            const name = user.firstName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.name;
            await sendResetEmail({ to: user.email, code, name });
        }
    } catch (e) {
        console.error(`[PasswordReset] Failed resending ${deliveryMethod}:`, e);
        return next(new InternalServerError(`Failed to resend reset code via ${deliveryMethod}`));
    }

    res.json(buildResetRequestResponse({ 
        user, 
        message: `New reset code sent to your registered ${deliveryMethod === 'sms' ? 'phone number' : 'email'}.`, 
        deliveryMethod 
    }));
});

module.exports = {
    requestAdminDispatcherReset,
    requestFocalReset,
    verifyResetCode,
    resetPassword,
    resendResetCode
};