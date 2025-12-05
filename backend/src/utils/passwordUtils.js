const crypto = require("crypto");
const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

// Configure Brevo
const brevoClient = SibApiV3Sdk.ApiClient.instance;
const brevoApiKey = brevoClient.authentications["api-key"];
brevoApiKey.apiKey = process.env.BREVO_API_KEY;
const brevoEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// Password Config
const TEMP_PASSWORD_LENGTH = 20;
const MAX_SPECIAL_CHARS = 3;

const PASSWORD_CHARSETS = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    digit: "0123456789",
    special: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

// ---------------- PASSWORD UTILITIES ---------------- //

function getRandomChar(chars = "") {
    return chars[crypto.randomInt(chars.length)];
}

function generateTemporaryPassword(length = TEMP_PASSWORD_LENGTH) {
    const minLength = Math.max(8, length);
    let specialCount = 0;

    // Required chars for the policy
    const passwordChars = [
        getRandomChar(PASSWORD_CHARSETS.upper),
        getRandomChar(PASSWORD_CHARSETS.lower),
        getRandomChar(PASSWORD_CHARSETS.digit),
        getRandomChar(PASSWORD_CHARSETS.special),
    ];

    specialCount = 1; // one special char already included

    const allChars = PASSWORD_CHARSETS.upper +
                     PASSWORD_CHARSETS.lower +
                     PASSWORD_CHARSETS.digit +
                     PASSWORD_CHARSETS.special;

    // Fill the remaining characters
    while (passwordChars.length < minLength) {
        let nextChar = getRandomChar(allChars);

        // Check if the char is special
        const isSpecial = PASSWORD_CHARSETS.special.includes(nextChar);

        // Limit special characters to max 3
        if (isSpecial && specialCount >= MAX_SPECIAL_CHARS) {
            continue; // skip and retry
        }

        passwordChars.push(nextChar);

        if (isSpecial) {
            specialCount++;
        }
    }

    // Shuffle using Fisher-Yates
    for (let i = passwordChars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    return passwordChars.join("");
}

// ---------------- EMAIL SENDER ---------------- //

async function sendTemporaryPasswordEmail({
    to,
    name,
    password,
    role,         // "dispatcher" | "focal"
    id,           // dispatcher/admin ID
    focalEmail,
    focalNumber
}) {
    if (!to) return;

    const sender = { email: process.env.EMAIL_USER, name: "ResQWave" };
    const displayName = (name || "User").trim() || "User";

    // Dynamic Profile Section (HTML)
    let profileSection = "";

    if (role === "dispatcher") {
        profileSection = `
            <p style="margin:0; font-size:14px;">
                <strong>ID:</strong> ${id}<br/>
                <strong>Temporary Password:</strong> ${password}
            </p>
        `;
    } else if (role === "focal") {
        profileSection = `
            <p style="margin:0; font-size:14px;">
                <strong>Email:</strong> ${focalEmail}<br/>
                <strong>Contact Number:</strong> ${focalNumber}<br/>
                <strong>Temporary Password:</strong> ${password}
            </p>
        `;
    }

    // FULL BEAUTIFIED EMAIL TEMPLATE
    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; background:#f3f4f6; padding:30px;">
            <div style="
                max-width:600px;
                margin:auto;
                background:white;
                border-radius:10px;
                box-shadow:0 2px 8px rgba(0,0,0,0.1);
                overflow:hidden;
            ">

                <!-- HEADER -->
                <div style="background:#2563eb; padding:18px 25px;">
                    <h1 style="margin:0; color:white; font-size:20px;">
                        ResQWave Account Credentials
                    </h1>
                </div>

                <!-- BODY -->
                <div style="padding:25px; color:#111827; font-size:15px; line-height:1.6;">
                    <p>Dear <strong>${displayName}</strong>,</p>

                    <p>Your ResQWave account has been successfully created. Below are your login details:</p>

                    <div style="
                        margin:20px 0;
                        padding:18px;
                        background:#f9fafb;
                        border-left:4px solid #2563eb;
                        border-radius:6px;
                    ">
                        ${profileSection}
                    </div>

                    <p style="margin-top:25px;">
                        For security purposes, please log in and 
                        <strong>change your temporary password immediately</strong>.
                    </p>

                    <p>If you did not expect this account, please notify your system administrator.</p>

                    <p>Thank you,<br><strong>ResQWave Team</strong></p>
                </div>

                <!-- FOOTER -->
                <div style="background:#f1f5f9; padding:12px 25px; text-align:center; font-size:12px; color:#6b7280;">
                    © ${new Date().getFullYear()} ResQWave — All rights reserved.
                </div>
            </div>
        </div>
    `;

    await brevoEmailApi.sendTransacEmail({
        sender,
        to: [{ email: to }],
        subject: "ResQWave Temporary Password",
        htmlContent: htmlTemplate
    });
}


module.exports = {
    generateTemporaryPassword,
    sendTemporaryPasswordEmail
};
