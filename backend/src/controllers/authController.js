const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { AppDataSource } = require("../config/dataSource");
const { sendLockoutEmail } = require("../utils/lockUtils");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const { sendSMS } = require("../utils/textbeeSMS");
const { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } = require("../exceptions");
const catchAsync = require("../utils/catchAsync");
require("dotenv").config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const adminRepo = AppDataSource.getRepository("Admin");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const loginVerificationRepo = AppDataSource.getRepository("LoginVerification");
const focalRepo = AppDataSource.getRepository("FocalPerson"); // ensure focalLogin works
const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");

// Registration
const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new BadRequestError("Name, email, and password are required"));
  }

  // check if already exists
  const existingAdmin = await adminRepo.findOne({
    where: [{ name }, { email }],
  });
  if (existingAdmin) {
    return next(new BadRequestError("Admin with this name or email already exists"));
  }

  // Get the last admin
  const lastAdmin = await adminRepo
    .createQueryBuilder("admin")
    .orderBy("admin.id", "DESC")
    .getOne();

  let newNumber = 1;
  if (lastAdmin) {
    const lastNumber = parseInt(lastAdmin.id.replace("ADM", ""), 10);
    newNumber = lastNumber + 1;
  }

  const newID = "ADM" + String(newNumber).padStart(3, "0");

  // Hash Password
  const hashedPassword = await bcrypt.hash(password, 10);

  const newAdmin = adminRepo.create({
    id: newID,
    name,
    email,
    password: hashedPassword,
  });

  await adminRepo.save(newAdmin);

  // Return the new admin's id
  res
    .status(201)
    .json({ message: "Admin Registered Successfully", id: newAdmin.id });
});

// Focal Person Login
const focalLogin = catchAsync(async (req, res, next) => {
  const { emailOrNumber, password } = req.body;
  if (!emailOrNumber || !password) {
    return next(new BadRequestError("Username and password are required"));
  }

  const focal = await focalRepo.findOne({
    where: [{ email: emailOrNumber }, { contactNumber: emailOrNumber }],
  });

  if (!focal) {
    // If password is 'dummy', just return not locked
    if (password === "dummy") {
      return res.json({ locked: false });
    }
    return res
      .status(400)
      .json({ message: "Invalid credentials! Please try again." });
  }

  // Check if focal person is archived
  if (focal.archived) {
    return res
      .status(403)
      .json({ message: "Account is not active. Please contact dispatcher." });
  }

  // If password is 'dummy', only return lockout status, do not increment failedAttempts
  if (password === "dummy") {
    if (focal.lockUntil && new Date(focal.lockUntil) > new Date()) {
      return res.json({
        locked: true,
        message:
          "Your account is temporarily locked due to too many failed attempts.",
        lockUntil: focal.lockUntil,
      });
    } else {
      return res.json({ locked: false });
    }
  }

  // Check if the Account is Locked
  let locked = false;
  let lockUntil = null;
  if (focal.lockUntil && new Date(focal.lockUntil) > new Date()) {
    locked = true;
    lockUntil = focal.lockUntil;
  }

  // Compare Password
  const isMatch = await bcrypt.compare(password, focal.password || "");
  if (!isMatch) {
    // Do NOT increment failedAttempts on simple login failures per request.
    // Preserve existing lock status but do not modify attempt counters here.
    return res.status(400).json({
      message: locked
        ? `Account Locked. Try again in 15 Minutes`
        : `Invalid Credentials`,
      locked,
      lockUntil,
    });
  }

  // Do NOT reset failedAttempts or lockUntil on successful login
  // Only reset after successful OTP verification

  // ----------------------------------------------------
  // TEST MODE BYPASS: If NODE_ENV is 'test', skip 2FA and return full token immediately
  // ----------------------------------------------------
  if (process.env.NODE_ENV === 'test') {
    const sessionID = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // Create session for logout compatibility
    await loginVerificationRepo.save({
      userID: focal.id,
      userType: "focalPerson",
      code: "999999",
      sessionID,
      expiry: sessionExpiry,
    });

    const token = jwt.sign(
      { id: focal.id, role: "focalPerson", name: focal.name, sessionID },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      message: "Focal login successful (Test Mode)",
      token,
      user: {
        id: focal.id,
        role: "focalPerson"
      }
    });
  }
  // ----------------------------------------------------

  // Generate Code
  var focalCode = crypto.randomInt(100000, 999999).toString();
  var focalExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 Minutes

  // Save to Login Verification
  var focalVerification = loginVerificationRepo.create({
    userID: focal.id,
    userType: "focalPerson",
    code: focalCode,
    expiry: focalExpiry,
  });
  await loginVerificationRepo.save(focalVerification);

  // Send OTP using Brevo
  try {
    const sender = { email: process.env.EMAIL_USER, name: "ResQWave Team" };
    const receivers = [{ email: focal.email }];

    await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: "ResQWave 2FA Verification",
      htmlContent: `
          <p>Dear ${focal.name || "User"},</p>
          <p>Your login verification code is:</p>
          <h2 style="color:#2E86C1;">${focalCode}</h2>
          <p>This code will expire in 5 minutes.</p>
          <p>Thank you,<br/>ResQWave Team</p>
        `,
    });

    console.log(`OTP email sent to ${focal.email}`);

    // Send OTP via SMS
    if (focal.contactNumber) {
      await sendSMS(
        focal.contactNumber,
        `Your ResQWave verification code is: ${focalCode}. Valid for 5 minutes.`
      );
    }
  } catch (err) {
    console.error("[focalLogin] Failed to send OTP via Brevo:", err);
    return res
      .status(500)
      .json({ message: "Failed to send verification email" });
  }

  // For dev only, log code
  console.log(` 2FA code for ${focal.id}: ${focalCode}`);
  var focalTempToken = jwt.sign(
    { id: focal.id, role: "focalPerson", step: "2fa" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  // Explicitly indicate OTP was sent so the frontend can safely navigate
  res.json({
    message: "Verification Send to Email",
    tempToken: focalTempToken,
    otpSent: true,
  });
});

// Focal Person OTP Verification
const verifyFocalLogin = catchAsync(async (req, res, next) => {
  const { tempToken, code } = req.body || {};
  if (!tempToken || !code) {
    return next(new BadRequestError("tempToken and code are required"));
  }
  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return next(new UnauthorizedError("Invalid or expired temp token"));
  }
  if (decoded.step !== "2fa" || decoded.role !== "focalPerson") {
    return next(new BadRequestError("Invalid token context"));
  }
  const focal = await focalRepo.findOne({ where: { id: decoded.id } });
  if (!focal) {
    return next(new NotFoundError("Focal Person Not Found"));
  }
  // Check if locked
  if (focal.lockUntil && new Date(focal.lockUntil) > new Date()) {
    const remaining = Math.ceil(
      (new Date(focal.lockUntil) - new Date()) / 60000
    );
    return res.status(400).json({
      locked: true,
      message: `Account Locked. Try again in ${remaining} Minutes`,
      lockUntil: focal.lockUntil,
    });
  }
  // Find OTP session
  const otpSession = await loginVerificationRepo.findOne({
    where: { userID: focal.id, userType: "focalPerson", code },
  });
  if (
    !otpSession ||
    (otpSession.expiry && new Date() > new Date(otpSession.expiry))
  ) {
    // Increment failedAttempts
    focal.failedAttempts = (focal.failedAttempts || 0) + 1;
    if (focal.failedAttempts >= 5) {
      focal.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      await focalRepo.save(focal);
      await sendLockoutEmail(focal.email, focal.name);
      return res.status(400).json({
        locked: true,
        message: "Too many failed attempts. Account locked.",
        lockUntil: focal.lockUntil,
      });
    }
    await focalRepo.save(focal);
    return res.status(400).json({
      message: `Invalid or expired code. Attempts ${focal.failedAttempts}/5`,
    });
  }
  // Success: reset failedAttempts, clear lock, delete OTP session
  focal.failedAttempts = 0;
  focal.lockUntil = null;
  await focalRepo.save(focal);
  await loginVerificationRepo.delete({
    userID: focal.id,
    userType: "focalPerson",
    code,
  });
  // Create session token (optional, for future use)
  const sessionID = crypto.randomUUID();
  const sessionExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await loginVerificationRepo.save({
    userID: focal.id,
    userType: "focalPerson",
    code: "OK",
    sessionID,
    expiry: sessionExpiry,
  });
  const token = jwt.sign(
    { id: focal.id, role: "focalPerson", name: focal.name, sessionID },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  // Fetch neighborhood information for the focal person
  let neighborhoodInfo = null;
  try {
    const neighborhood = await neighborhoodRepo.findOne({
      where: { focalPersonID: focal.id }
    });

    if (neighborhood) {
      // Fetch terminal separately since Neighborhood doesn't have a relation
      let terminalName = neighborhood.terminalID;
      if (neighborhood.terminalID) {
        const terminalRepo = AppDataSource.getRepository("Terminal");
        const terminal = await terminalRepo.findOne({
          where: { id: neighborhood.terminalID }
        });
        if (terminal) {
          terminalName = terminal.location || terminal.id;
        }
      }

      neighborhoodInfo = {
        id: neighborhood.id,
        terminalID: neighborhood.terminalID,
        terminalName: terminalName,
      };
    }
  } catch (err) {
    console.error('Failed to fetch neighborhood info:', err);
    // Continue without neighborhood info
  }

  // Construct name from firstName and lastName for compatibility
  const fullName = `${focal.firstName || ''} ${focal.lastName || ''}`.trim() || 'User';

  // Parse address ONLY for addressText field, keep original for backward compatibility
  let addressText = focal.address || '';
  try {
    if (addressText && typeof addressText === 'string' && (addressText.startsWith('{') || addressText.startsWith('['))) {
      const addressObj = JSON.parse(addressText);
      addressText = addressObj.address || addressObj.name || addressText;
    }
  } catch (e) {
    // If parsing fails, use the raw address string
    console.log('Address is not JSON, using as-is');
  }

  return res.json({
    message: "Login successful",
    token,
    user: {
      id: focal.id,
      name: fullName,
      firstName: focal.firstName,
      lastName: focal.lastName,
      email: focal.email,
      address: focal.address, // Keep original for backward compatibility
      addressText: addressText, // New field with parsed address text only
      role: "focalPerson",
      newUser: focal.newUser || false,
      neighborhood: neighborhoodInfo,
    },
  });
});

// --- ADMIN & DISPATCHER LOGIN ---
const adminDispatcherLogin = catchAsync(async (req, res, next) => {
  const { userID, password } = req.body || {};
  const identifier = String(userID || "").trim();

  if (!identifier || !password) {
    return next(new BadRequestError("User ID and password are required."));
  }

  // 1. FIXED: Parallel Database Lookup
  const [admin, dispatcher] = await Promise.all([
    adminRepo.findOne({ where: { id: identifier } }),
    dispatcherRepo.findOne({ where: { id: identifier } }),
  ]);

  // Unified user identification
  const role = admin ? "admin" : dispatcher ? "dispatcher" : null;
  const user = admin || dispatcher;
  const repo = admin ? adminRepo : dispatcherRepo;

  // 2. TIMING ATTACK PROTECTION
  // If no user exists, run bcrypt anyway to keep response times consistent
  if (!user) {
    const dummyHash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgNIvB.37yK7G/5DNIb.u8J8R/7m";
    await bcrypt.compare(password, dummyHash);
    return res.status(400).json({ message: "Invalid credentials! Please try again." });
  }

  // 3. STATUS CHECKS
  if (role === "dispatcher" && user.archived) {
    return res.status(403).json({ message: "Account is not active. Please contact the admin." });
  }

  if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
    const remaining = Math.ceil((new Date(user.lockUntil) - new Date()) / 60000);
    return res.status(403).json({ message: `Account Locked. Try again in ${remaining} minutes.` });
  }

  // 4. PASSWORD VERIFICATION
  const isMatch = await bcrypt.compare(password, user.password || "");
  if (!isMatch) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      await repo.save(user);
      // Fire and forget lockout email
      sendLockoutEmail(user.email, user.name).catch(err => console.error("Lockout Email Fail:", err));
      return res.status(403).json({ message: "Too Many Failed Attempts. Locked for 15 minutes." });
    }
    await repo.save(user);
    return res.status(400).json({ message: `Invalid Credentials. Attempts left: ${5 - user.failedAttempts}/5.` });
  }

  // Reset attempts on success
  user.failedAttempts = 0;
  user.lockUntil = null;
  await repo.save(user);

  // Clean previous OTPs
  await loginVerificationRepo.delete({ userID: user.id, userType: role });

  // 5. TEST MODE BYPASS
  if (process.env.NODE_ENV === 'test') {
    const sessionID = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000);
    
    await loginVerificationRepo.save({
      userID: user.id, userType: role, code: "999999", sessionID, expiry: sessionExpiry,
    });

    const token = jwt.sign(
      { id: user.id, role, name: user.name, sessionID },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Login successful (Test Mode)",
      token,
      user: { id: user.id, name: user.name, email: user.email, role }
    });
  }

  // 6. OTP GENERATION
  const code = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  
  await loginVerificationRepo.save({ userID: user.id, userType: role, code, expiry });

  // 7. FIXED: Non-blocking Notifications (Background Tasks)
  const emailData = {
    sender: { email: process.env.EMAIL_USER, name: "ResQWave Team" },
    to: [{ email: user.email }],
    subject: "ResQWave Login Verification Code",
    htmlContent: `<p>Dear ${user.name || "User"},</p><p>Your verification code is:</p><h2 style="color:#2E86C1;">${code}</h2><p>Expires in 5 mins.</p>`
  };

  console.log("Your Verification code is:", code);

  // Do not 'await' these calls - let them run in the background
  tranEmailApi.sendTransacEmail(emailData).catch(err => console.error("OTP Email Failed:", err));
  
  if (user.contactNumber) {
    sendSMS(user.contactNumber, `Your ResQWave code is: ${code}`).catch(err => console.error("OTP SMS Failed:", err));
  }

  const tempToken = jwt.sign({ id: user.id, role, step: "2fa" }, process.env.JWT_SECRET, { expiresIn: "5m" });
  return res.json({ message: "Verification code sent", tempToken });
});


// --- COMBINED 2FA VERIFY ---
const adminDispatcherVerify = catchAsync(async (req, res, next) => {
  const { tempToken, code } = req.body || {};
  if (!tempToken || !code) return next(new BadRequestError("tempToken and code are required"));

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return next(new UnauthorizedError("Invalid or expired temp token"));
  }

  if (decoded.step !== "2fa" || !["admin", "dispatcher"].includes(decoded.role)) {
    return next(new BadRequestError("Invalid token context"));
  }

  // Unified Repo selection
  const repo = decoded.role === "admin" ? adminRepo : dispatcherRepo;

  // Validate OTP
  const otpSession = await loginVerificationRepo.findOne({
    where: { userID: decoded.id, userType: decoded.role, code },
  });

  if (!otpSession || (otpSession.expiry && new Date() > new Date(otpSession.expiry))) {
    const user = await repo.findOne({ where: { id: decoded.id } });
    if (user) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      if (user.failedAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await repo.save(user);
        sendLockoutEmail(user.email, user.name).catch(console.error);
        return next(new ForbiddenError("Too many failed attempts. Account locked."));
      }
      await repo.save(user);
    }
    return next(new BadRequestError(`Invalid or expired code. Attempts: ${user?.failedAttempts || 0}/5`));
  }

  // Finalize Login
  const user = await repo.findOne({ where: { id: decoded.id } });
  if (!user) return next(new NotFoundError("User not found"));

  user.failedAttempts = 0;
  user.lockUntil = null;
  await repo.save(user);

  await loginVerificationRepo.delete({ userID: decoded.id, userType: decoded.role, code });

  const sessionID = crypto.randomUUID();
  await loginVerificationRepo.save({
    userID: decoded.id, userType: decoded.role, code: "OK", sessionID, expiry: new Date(Date.now() + 8 * 60 * 60 * 1000)
  });

  const token = jwt.sign(
    { id: user.id, role: decoded.role, name: user.name, sessionID },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  return res.json({
    message: "Login successful",
    token,
    user: { id: user.id, name: user.name, email: user.email, role: decoded.role, phoneNumber: user.phoneNumber }
  });
});

// Get Current User (Token Validation)
const getCurrentUser = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new UnauthorizedError("No Token Provided"));
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(new UnauthorizedError("Invalid Token Format"));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new UnauthorizedError("Invalid or Expired Token"));
  }

  // Verify session is still active (if sessionID exists)
  if (decoded.sessionID) {
    const session = await loginVerificationRepo.findOne({
      where: { sessionID: decoded.sessionID },
    });

    if (!session) {
      return next(new UnauthorizedError("Session Expired"));
    }

    // Check if session has expired
    if (session.expiry && new Date() > new Date(session.expiry)) {
      await loginVerificationRepo.delete({ sessionID: decoded.sessionID });
      return next(new UnauthorizedError("Session Expired"));
    }
  }

  // Get user data based on role
  let userData = null;
  if (decoded.role === "admin") {
    const admin = await adminRepo.findOne({ where: { id: decoded.id } });
    if (!admin) {
      return next(new NotFoundError("Admin Not Found"));
    }
    userData = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      contactNumber: admin.contactNumber,
      role: "admin",
      passwordLastUpdated: admin.passwordLastUpdated
    };
  } else if (decoded.role === "dispatcher") {
    const dispatcher = await dispatcherRepo.findOne({
      where: { id: decoded.id },
    });
    if (!dispatcher) {
      return next(new NotFoundError("Dispatcher Not Found"));
    }
    userData = {
      id: dispatcher.id,
      name: dispatcher.name,
      email: dispatcher.email,
      contactNumber: dispatcher.contactNumber,
      role: "dispatcher",
      passwordLastUpdated: dispatcher.passwordLastUpdated
    };
  } else if (decoded.role === "focalPerson") {
    const focal = await focalRepo.findOne({ where: { id: decoded.id } });
    if (!focal) {
      return next(new NotFoundError("Focal Person Not Found"));
    }
    userData = {
      id: focal.id,
      firstName: focal.firstName || focal.name?.split(' ')[0] || '',
      lastName: focal.lastName || focal.name?.split(' ').slice(1).join(' ') || '',
      email: focal.email,
      phone: focal.contactNumber,
      address: focal.address,
      photo: focal.photo,
      lastPasswordChange: focal.passwordLastUpdated,
      role: "focalPerson",
    };
  } else {
    return next(new BadRequestError("Invalid User Role"));
  }

  res.json({ user: userData });
});

// Resend Focal Login OTP
const resendFocalLoginCode = catchAsync(async (req, res, next) => {
  const { tempToken, emailOrNumber } = req.body || {};

  let focal = null;

  if (tempToken) {
    try {
      const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (decoded.role !== "focalPerson") {
        return next(new BadRequestError("Invalid temp token"));
      }
      focal = await focalRepo.findOne({ where: { id: decoded.id } });
    } catch {
      return next(new UnauthorizedError("Invalid or expired temp token"));
    }
  } else {
    const identifier = String(emailOrNumber || "").trim();
    if (!identifier)
      return next(new BadRequestError("emailOrNumber is required"));
    focal = await focalRepo.findOne({
      where: [{ email: identifier }, { contactNumber: identifier }],
    });
  }

  if (!focal)
    return next(new NotFoundError("Focal Person Not Found"));

  // Generate new code
  const code = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  // Replace any pending OTP for this user
  await loginVerificationRepo.delete({
    userID: focal.id,
    userType: "focalPerson",
  });
  await loginVerificationRepo.save({
    userID: focal.id,
    userType: "focalPerson",
    code,
    expiry,
  });

  // Send email
  try {
    const sender = { email: process.env.EMAIL_USER, name: "ResQWave Team" };
    const receivers = [{ email: focal.email }];

    await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: "ResQWave 2FA Verification (Resend)",
      htmlContent: `
          <p>Dear ${focal.name || "Focal Person"},</p>
          <p>Your login verification code is:</p>
          <h2 style="color:#2E86C1;">${code}</h2>
          <p>This code will expire in 5 minutes.</p>
          <p>Thank you,<br/>ResQWave Team</p>
        `,
    });

    console.log(` Resent verification code to ${focal.email}`);

    // Send OTP via SMS
    if (focal.contactNumber) {
      await sendSMS(
        focal.contactNumber,
        `Your ResQWave verification code is: ${code}. Valid for 5 minutes.`
      );
    }
  } catch (emailErr) {
    console.error(
      " Failed to send Brevo email:",
      emailErr.response?.text || emailErr
    );
    return res
      .status(500)
      .json({ message: "Failed to send verification email" });
  }

  // Return a fresh temp token for the new code window
  const newTempToken = jwt.sign(
    { id: focal.id, role: "focalPerson", step: "2fa" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  return res.json({
    message: "Verification Resent",
    tempToken: newTempToken,
  });
});

// Resend Admin/Dispatcher OTP
const resendAdminDispatcherCode = catchAsync(async (req, res, next) => {
  const { tempToken, emailOrNumber } = req.body || {};

  let role = null;
  let user = null;
  let recipientEmail = null;

  if (tempToken) {
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      // If token is expired, decode it without verification to get the user ID
      console.log('Token expired, attempting to decode without verification:', err.message);
      try {
        decoded = jwt.decode(tempToken);
        if (
          !decoded ||
          !decoded.id ||
          !decoded.role ||
          decoded.step !== "2fa"
        ) {
          return next(new UnauthorizedError("Invalid temp token"));
        }
        // Token is expired but we can still extract the user info for resend
        console.log(
          `Resending code with expired token for user ${decoded.id}`
        );
      } catch {
        return next(new UnauthorizedError("Invalid temp token"));
      }
    }
    if (
      decoded.step !== "2fa" ||
      !["admin", "dispatcher"].includes(decoded.role)
    ) {
      return next(new BadRequestError("Invalid token context"));
    }
    role = decoded.role;

    if (role === "admin") {
      user = await adminRepo.findOne({ where: { id: decoded.id } });
      recipientEmail = user?.email || null;
    } else {
      user = await dispatcherRepo.findOne({ where: { id: decoded.id } });
      recipientEmail = user?.email || null;
    }
  } else {
    const identifier = String(emailOrNumber || "").trim();
    if (!identifier)
      return next(new BadRequestError("emailOrNumber is required"));

    // Try Admin by name first (matches your login flow)
    const admin = await adminRepo.findOne({ where: { name: identifier } });
    if (admin) {
      role = "admin";
      user = admin;
      recipientEmail = admin.email;
    } else {
      const dispatcher = await dispatcherRepo.findOne({
        where: [{ email: identifier }, { contactNumber: identifier }],
      });
      if (dispatcher) {
        role = "dispatcher";
        user = dispatcher;
        recipientEmail = dispatcher.email;
      }
    }
  }

  if (!user || !role) {
    return next(new NotFoundError("User not found"));
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  await loginVerificationRepo.delete({ userID: user.id, userType: role });
  await loginVerificationRepo.save({
    userID: user.id,
    userType: role,
    code,
    expiry,
  });

  // Send Email
  try {
    const sender = { email: process.env.EMAIL_USER, name: "ResQWave Team" }; // must be verified in Brevo
    const receivers = [{ email: recipientEmail }];

    await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: "ResQWave Login Verification Code (Resend)",
      htmlContent: `
          <p>Dear ${user.name || role},</p>
          <p>Your login verification code is:</p>
          <h2 style="color:#2E86C1;">${code}</h2>
          <p>This code will expire in 5 minutes.</p>
          <p>Thank you,<br/>ResQWave Team</p>
        `,
    });

    console.log(`Verification code sent to ${recipientEmail}`);

    // Send OTP via SMS
    if (user.contactNumber) {
      await sendSMS(
        user.contactNumber,
        `Your ResQWave verification code is: ${code}. Valid for 5 minutes.`
      );
    }
  } catch (emailErr) {
    console.error(
      "Failed to send Brevo email:",
      emailErr.response?.text || emailErr
    );
    return res
      .status(500)
      .json({ message: "Failed to send verification email" });
  }

  const newTempToken = jwt.sign(
    { id: user.id, role, step: "2fa" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  return res.json({
    message: "Verification Resent",
    tempToken: newTempToken,
  });
});

// Logout
const logout = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(new UnauthorizedError("No token"));

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.sessionID) {
    await loginVerificationRepo.delete({ sessionID: decoded.sessionID });
  }

  res.json({ message: "Logged Out Succesfully" });
});

module.exports = {
  register,
  focalLogin,
  logout,
  adminDispatcherLogin,
  adminDispatcherVerify,
  resendFocalLoginCode,
  verifyFocalLogin,
  resendAdminDispatcherCode,
  getCurrentUser,
};
