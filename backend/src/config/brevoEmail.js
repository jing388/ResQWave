const SibApiV3Sdk = require('sib-api-v3-sdk');

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendVerificationEmail(to, name, link) {
  try {
    const sender = { email: 'youremail@yourdomain.com', name: 'ResQWave Team' };
    const receivers = [{ email: to }];

    await tranEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: 'Verify your ResQWave account',
      htmlContent: `
        <h2>Hello ${name},</h2>
        <p>Click below to verify your email:</p>
        <a href="${link}">Verify Email</a>
      `,
    });

    console.log('✅ Verification email sent successfully!');
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

module.exports = { sendVerificationEmail };
