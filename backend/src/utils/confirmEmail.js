const { sendEmail } = require("./emailTemplate");

const sendVerificationEmail = async (email, name, code) => {
    return await sendEmail({
        email,
        name,
        code,
        subject: "ResQWave Email Verification",
        title: "Email Verification",
        message: "You have requested to change your email address."
    });
};

module.exports = { sendVerificationEmail };
