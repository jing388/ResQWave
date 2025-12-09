const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendLockoutEmail = async (email, name) => {
  try {
    const sender = { email: process.env.EMAIL_USER, name: "ResQWave Team" };
    const receivers = [{ email }];

    await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: "ResQWave - Account Temporarily Locked",
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
              <td style="background:#D32F2F; padding:20px; text-align:center; color:#ffffff;">
                <h1 style="margin:0; font-size:24px; font-family:Arial, sans-serif;">
                  Account Temporarily Locked
                </h1>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding:30px; font-family:Arial, sans-serif; color:#333333; line-height:1.6;">
                <p>Dear <strong>${name || "User"}</strong>,</p>

                <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
                <p>This security measure is in place to protect your account from unauthorized access.</p>
                <p>If you did not attempt to log in, we strongly recommend updating your security information.</p>

                <!-- RED BOX -->
                <table width="100%" style="background:#ffebee; border-left:4px solid #D32F2F; margin:20px 0;">
                  <tr>
                    <td style="padding:15px;">
                      <p style="margin:0; color:#c62828; font-weight:bold; font-family:Arial, sans-serif;">
                        Please try again in 15 minutes.
                      </p>
                      <p style="margin:10px 0 0; font-size:14px; color:#333;">
                        If you did not attempt to sign in, please change your password immediately to secure your account.
                      </p>
                    </td>
                  </tr>
                </table>

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

    console.log(`Lockout email sent to ${email}`);
  } catch (err) {
    console.error("Failed to send lockout email:", err);
  }
};

module.exports = { sendLockoutEmail };
