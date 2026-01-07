const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { AppDataSource } = require("../config/dataSource");
const { sendLockoutEmail } = require("../utils/lockUtils");
const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const adminRepo = AppDataSource.getRepository("Admin");
const dispatcherRepo = AppDataSource.getRepository("Dispatcher");
const loginVerificationRepo = AppDataSource.getRepository("LoginVerification");
const focalRepo = AppDataSource.getRepository("FocalPerson"); // ensure focalLogin works

// Registration
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    // check if already exists
    const existingAdmin = await adminRepo.findOne({
      where: [{ name }, { email }],
    });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin with this name or email already exists" });
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Focal Person Login
const focalLogin = async (req, res) => {
  try {
    const { emailOrNumber, password } = req.body;
    if (!emailOrNumber || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
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
      locked,
      lockUntil,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - LOGIN 2FA" });
  }
};

// Focal Person OTP Verification
const verifyFocalLogin = async (req, res) => {
  try {
    const { tempToken, code } = req.body || {};
    if (!tempToken || !code) {
      return res
        .status(400)
        .json({ message: "tempToken and code are required" });
    }
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired temp token" });
    }
    if (decoded.step !== "2fa" || decoded.role !== "focalPerson") {
      return res.status(400).json({ message: "Invalid token context" });
    }
    const focal = await focalRepo.findOne({ where: { id: decoded.id } });
    if (!focal) {
      return res.status(404).json({ message: "Focal Person Not Found" });
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
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: focal.id,
        name: focal.name,
        email: focal.email,
        role: "focalPerson",
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - VERIFY Focal 2FA" });
  }
};

const adminDispatcherLogin = async (req, res) => {
  try {
    const { userID, password } = req.body || {};
    const identifier = String(userID || "").trim();

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "User ID and password are required." });
    }

    let role = null;
    let user = null;
    let recipientEmail = null;

    // Try Admin by ID
    const admin = await adminRepo.findOne({ where: { id: identifier } });
    if (admin) {
      // Check if locked
      if (admin.lockUntil && new Date(admin.lockUntil) > new Date()) {
        const remaining = Math.ceil(
          (new Date(admin.lockUntil) - new Date()) / 60000
        );
        return res.status(403).json({
          message: `Account Locked. Try again in ${remaining} minutes.`,
        });
      }
      const isMatch = await bcrypt.compare(password, admin.password || "");
      if (!isMatch) {
        admin.failedAttempts = (admin.failedAttempts || 0) + 1;
        if (admin.failedAttempts >= 5) {
          admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await adminRepo.save(admin);
          await sendLockoutEmail(admin.email, admin.name);
          return res.status(403).json({ message: "Too Many Failed Attempts" });
        }
        await adminRepo.save(admin);
        return res.status(400).json({
          message: `Invalid Credentials. Attempts left: ${admin.failedAttempts}/5.`,
        });
      }
      // Reset Attempts on Success
      admin.failedAttempts = 0;
      admin.lockUntil = null;
      await adminRepo.save(admin);
      role = "admin";
      user = admin;
      recipientEmail = admin.email;
    }

    // If not admin, try Dispatcher
    if (!user) {
      const dispatcher = await dispatcherRepo.findOne({
        where: { id: identifier },
      });
      if (dispatcher) {
        // Check if archived
        if (dispatcher.archived) {
          return res.status(403).json({
            message: "Account is not active. Please contact the admin.",
          });
        }
        // Check if locked
        if (
          dispatcher.lockUntil &&
          new Date(dispatcher.lockUntil) > new Date()
        ) {
          const remaining = Math.ceil(
            (new Date(dispatcher.lockUntil) - new Date()) / 60000
          );
          return res.status(403).json({
            message: `Account Locked. Try again in ${remaining} Minutes`,
          });
        }
        const isMatch = await bcrypt.compare(
          password,
          dispatcher.password || ""
        );
        if (!isMatch) {
          dispatcher.failedAttempts = (dispatcher.failedAttempts || 0) + 1;
          if (dispatcher.failedAttempts >= 5) {
            dispatcher.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            await dispatcherRepo.save(dispatcher);
            await sendLockoutEmail(dispatcher.email, dispatcher.name);
            return res.status(403).json({
              message: `Too many failed attempts. Please try again after: ${dispatcher.lockUntil}`,
            });
          }
          await dispatcherRepo.save(dispatcher);
          return res.status(400).json({
            message: `Invalid Credentials. Attempts left: ${dispatcher.failedAttempts}/5`,
          });
        }
        // Reset Attempts on Success
        dispatcher.failedAttempts = 0;
        dispatcher.lockUntil = null;
        await dispatcherRepo.save(dispatcher);
        role = "dispatcher";
        user = dispatcher;
        recipientEmail = dispatcher.email;
      }
    }

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid credentials! Please try again." });
    }

    // Clean previous OTPs for this user
    await loginVerificationRepo.delete({ userID: user.id, userType: role });

    // Generate and save OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    await loginVerificationRepo.save({
      userID: user.id,
      userType: role,
      code,
      expiry,
    });

    // Send email
    try {
      const sender = { email: process.env.EMAIL_USER, name: "ResQWave Team" }; // or your verified Brevo sender
      const receivers = [{ email: recipientEmail }];

      await tranEmailApi.sendTransacEmail({
        sender,
        to: receivers,
        subject: "ResQWave Login Verification Code",
        htmlContent: `
            <p>Dear ${user.name || "User"},</p>
            <p>Your verification code is:</p>
            <h2 style="color:#2E86C1;">${code}</h2>
            <p>This code will expire in 5 minutes.</p>
            <p>Thank you,<br/>ResQWave Team</p>
          `,
      });

      console.log(`Verification email sent to ${recipientEmail}`);
    } catch (err) {
      console.error("[dispatcherLogin] Failed to send OTP via Brevo:", err);
      return res
        .status(500)
        .json({ message: "Failed to send verification email" });
    }

    console.log(` 2FA code: ${code}`);

    const tempToken = jwt.sign(
      { id: user.id, role, step: "2fa" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return res.json({ message: "Verification code sent", tempToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - LOGIN 2FA" });
  }
};

// COMBINED 2FA VERIFY (Admin | Dispatcher)
const adminDispatcherVerify = async (req, res) => {
  try {
    const { tempToken, code } = req.body || {};
    if (!tempToken || !code) {
      return res
        .status(400)
        .json({ message: "tempToken and code are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired temp token" });
    }
    if (
      decoded.step !== "2fa" ||
      !["admin", "dispatcher"].includes(decoded.role)
    ) {
      return res.status(400).json({ message: "Invalid token context" });
    }

    // Validate the OTP code against stored verification
    const otpSession = await loginVerificationRepo.findOne({
      where: { userID: decoded.id, userType: decoded.role, code },
    });

    if (
      !otpSession ||
      (otpSession.expiry && new Date() > new Date(otpSession.expiry))
    ) {
      // Get user for failed attempt tracking
      let user = null;
      if (decoded.role === "admin") {
        user = await adminRepo.findOne({ where: { id: decoded.id } });
      } else {
        user = await dispatcherRepo.findOne({ where: { id: decoded.id } });
      }

      if (user) {
        // Increment failed attempts
        user.failedAttempts = (user.failedAttempts || 0) + 1;

        // Lock account after 5 failed attempts
        if (user.failedAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
          if (decoded.role === "admin") {
            await adminRepo.save(user);
          } else {
            await dispatcherRepo.save(user);
          }
          await sendLockoutEmail(user.email, user.name);
          return res.status(403).json({
            message: "Too many failed attempts. Account locked for 15 minutes.",
          });
        }

        // Save failed attempt count
        if (decoded.role === "admin") {
          await adminRepo.save(user);
        } else {
          await dispatcherRepo.save(user);
        }
      }

      return res.status(400).json({
        message: `Invalid or expired verification code. Attempts: ${
          user?.failedAttempts || 0
        }/5`,
      });
    }

    // Get user for successful login
    let user = null;
    if (decoded.role === "admin") {
      user = await adminRepo.findOne({ where: { id: decoded.id } });
    } else {
      user = await dispatcherRepo.findOne({ where: { id: decoded.id } });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Reset failed attempts on successful verification
    user.failedAttempts = 0;
    user.lockUntil = null;
    if (decoded.role === "admin") {
      await adminRepo.save(user);
    } else {
      await dispatcherRepo.save(user);
    }

    // Delete the used OTP
    await loginVerificationRepo.delete({
      userID: decoded.id,
      userType: decoded.role,
      code,
    });

    // Create session (so logout can invalidate)
    const sessionID = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await loginVerificationRepo.save({
      userID: decoded.id,
      userType: decoded.role,
      code: "OK",
      sessionID,
      expiry: sessionExpiry,
    });

    // Get user data for response
    let userData = null;
    if (decoded.role === "admin") {
      userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "admin",
      };
    } else {
      userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: "dispatcher",
      };
    }

    const token = jwt.sign(
      { id: decoded.id, role: decoded.role, name: userData.name, sessionID },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - VERIFY 2FA" });
  }
};

// Get Current User (Token Validation)
const getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No Token Provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Invalid Token Format" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or Expired Token" });
    }

    // Verify session is still active (if sessionID exists)
    if (decoded.sessionID) {
      const session = await loginVerificationRepo.findOne({
        where: { sessionID: decoded.sessionID },
      });

      if (!session) {
        return res.status(401).json({ message: "Session Expired" });
      }

      // Check if session has expired
      if (session.expiry && new Date() > new Date(session.expiry)) {
        await loginVerificationRepo.delete({ sessionID: decoded.sessionID });
        return res.status(401).json({ message: "Session Expired" });
      }
    }

    // Get user data based on role
    let userData = null;
    if (decoded.role === "admin") {
      const admin = await adminRepo.findOne({ where: { id: decoded.id } });
      if (!admin) {
        return res.status(404).json({ message: "Admin Not Found" });
      }
      userData = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
        passwordLastUpdated: admin.passwordLastUpdated
      };
    } else if (decoded.role === "dispatcher") {
      const dispatcher = await dispatcherRepo.findOne({
        where: { id: decoded.id },
      });
      if (!dispatcher) {
        return res.status(404).json({ message: "Dispatcher Not Found" });
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
        return res.status(404).json({ message: "Focal Person Not Found" });
      }
      userData = {
        id: focal.id,
        name: focal.name,
        email: focal.email,
        role: "focalPerson",
      };
    } else {
      return res.status(400).json({ message: "Invalid User Role" });
    }

    res.json({ user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Resend Focal Login OTP
const resendFocalLoginCode = async (req, res) => {
  try {
    const { tempToken, emailOrNumber } = req.body || {};

    let focal = null;

    if (tempToken) {
      try {
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        if (decoded.step !== "2fa" || decoded.role !== "focalPerson") {
          return res.status(400).json({ message: "Invalid token context" });
        }
        focal = await focalRepo.findOne({ where: { id: decoded.id } });
      } catch {
        return res
          .status(401)
          .json({ message: "Invalid or expired temp token" });
      }
    } else {
      const identifier = String(emailOrNumber || "").trim();
      if (!identifier)
        return res.status(400).json({ message: "emailOrNumber is required" });
      focal = await focalRepo.findOne({
        where: [{ email: identifier }, { contactNumber: identifier }],
      });
    }

    if (!focal)
      return res.status(404).json({ message: "Focal Person Not Found" });

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error - RESEND Focal 2FA" });
  }
};

// Resend Admin/Dispatcher OTP
const resendAdminDispatcherCode = async (req, res) => {
  try {
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
        try {
          decoded = jwt.decode(tempToken);
          if (
            !decoded ||
            !decoded.id ||
            !decoded.role ||
            decoded.step !== "2fa"
          ) {
            return res.status(401).json({ message: "Invalid temp token" });
          }
          // Token is expired but we can still extract the user info for resend
          console.log(
            `Resending code with expired token for user ${decoded.id}`
          );
        } catch {
          return res.status(401).json({ message: "Invalid temp token" });
        }
      }
      if (
        decoded.step !== "2fa" ||
        !["admin", "dispatcher"].includes(decoded.role)
      ) {
        return res.status(400).json({ message: "Invalid token context" });
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
        return res.status(400).json({ message: "emailOrNumber is required" });

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
      return res.status(404).json({ message: "User not found for resend" });
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
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server Error - RESEND Admin/Dispatcher 2FA" });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No Token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.sessionID) {
      await loginVerificationRepo.delete({ sessionID: decoded.sessionID });
    }

    res.json({ message: "Logged Out Succesfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

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
