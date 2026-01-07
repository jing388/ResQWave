const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendVerificationEmail = async (email, name, code) => {
    try {
        const sender = { email: process.env.EMAIL_USER, name: "ResQWave Team" };
        const receivers = [{ email: email }];

        await tranEmailApi.sendTransacEmail({
            sender,
            to: receivers,
            subject: "ResQWave Email Verification",
            htmlContent: `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:#f4f4f4;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f4f4f4; padding:20px 0;">
      <tr>
        <td align="center">
          
          <!-- MAIN CONTAINER -->
          <table width="600" border="0" cellspacing="0" cellpadding="0" 
            style="background:#ffffff; border-radius:8px; overflow:hidden;">

            <!-- HEADER -->
            <tr>
              <td style="background:#2E86C1; padding:20px; text-align:center; color:#ffffff;">
                <h1 style="margin:0; font-size:24px; font-family:Arial, sans-serif;">
                  Email Verification
                </h1>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding:30px; font-family:Arial, sans-serif; color:#333333; line-height:1.6;">
                <p>Dear <strong>${name || "User"}</strong>,</p>

                <p>You have requested to change your email address.</p>
                
                <!-- BLUE BOX -->
                <table width="100%" style="background:#e3f2fd; border-left:4px solid #2E86C1; margin:20px 0;">
                  <tr>
                    <td style="padding:15px; text-align:center;">
                      <p style="margin:0; font-size:16px; color:#333;">Your verification code is:</p>
                      <h2 style="margin:10px 0; color:#2E86C1; font-size:32px; letter-spacing: 5px;">${code}</h2>
                      <p style="margin:0; font-size:14px; color:#555;">
                        This code will expire in 5 minutes.
                      </p>
                    </td>
                  </tr>
                </table>

                <p>If you did not request this change, please ignore this email.</p>

                <p>Thank you,<br>The ResQWave Team</p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background:#f9f9f9; padding:15px; text-align:center; font-size:12px; color:#666; font-family:Arial, sans-serif;">
                &copy; ${new Date().getFullYear()} ResQWave. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
            `,
        });

        console.log(`Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email");
    }
};

module.exports = { sendVerificationEmail };
