const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail", // Fixed: should be "gmail" not "smtp.gmail.com"
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add timeout configurations to prevent connection timeout errors
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000,      // 60 seconds
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("[Email Config] SMTP connection failed:", error.message);
  } else {
    console.log("[Email Config] SMTP server is ready to send emails");
  }
});

module.exports = transporter;
