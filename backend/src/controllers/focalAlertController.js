const { sendSMS } = require('../utils/textbeeSMS');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { AppDataSource } = require('../config/dataSource');
require('dotenv').config();

// Setup Brevo API
const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Alert focal person with SMS and Email
 * Includes weather conditions, terminal location, and alert reason
 */
const alertFocalPerson = async (req, res) => {
    try {
        const { terminalID, alertReason, weatherConditions, dispatcherName } = req.body;

        // Validate required fields
        if (!terminalID) {
            return res.status(400).json({
                status: 'error',
                message: 'Terminal ID is required'
            });
        }

        // Get neighborhood/community data to find focal person
        const neighborhoodRepo = AppDataSource.getRepository('Neighborhood');
        const neighborhood = await neighborhoodRepo
            .createQueryBuilder('neighborhood')
            .where('neighborhood.terminalID = :terminalID', { terminalID })
            .getOne();

        if (!neighborhood) {
            return res.status(404).json({
                status: 'error',
                message: 'Terminal not found or no focal person assigned'
            });
        }

        // Check if neighborhood has a focal person assigned
        if (!neighborhood.focalPersonID) {
            return res.status(404).json({
                status: 'error',
                message: 'No focal person assigned to this terminal'
            });
        }

        // Get focal person from FocalPerson table
        const focalPersonRepo = AppDataSource.getRepository('FocalPerson');
        const focalPerson = await focalPersonRepo.findOne({
            where: { id: neighborhood.focalPersonID }
        });

        if (!focalPerson) {
            return res.status(404).json({
                status: 'error',
                message: 'Focal person not found'
            });
        }

        // Extract focal person details
        const focalPersonName = `${focalPerson.firstName || ''} ${focalPerson.lastName || ''}`.trim() || 'Focal Person';
        const focalPersonPhone = focalPerson.contactNumber;
        const focalPersonEmail = focalPerson.email;

        if (!focalPersonPhone && !focalPersonEmail) {
            return res.status(400).json({
                status: 'error',
                message: 'Focal person has no contact information (phone or email)'
            });
        }

        // Get terminal information
        const terminalRepo = AppDataSource.getRepository('Terminal');
        const terminal = await terminalRepo.findOne({
            where: { id: terminalID }
        });

        // Parse address from JSON if it's a string
        let location = 'Location not specified';
        if (focalPerson.address) {
            try {
                const addressData = typeof focalPerson.address === 'string'
                    ? JSON.parse(focalPerson.address)
                    : focalPerson.address;
                location = addressData.address || 'Location not specified';
            } catch (error) {
                // If parsing fails, use as-is (in case it's plain text)
                location = focalPerson.address;
            }
        }

        // Build alert message
        const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
        const terminalName = terminal?.name || terminalID;

        const smsMessage = `⚠️ RESQWAVE EMERGENCY ALERT

Terminal: ${terminalName}
Location: ${location}

Alert Reason: ${alertReason || 'Potential flood risk detected'}

Weather Conditions:
${weatherConditions || 'Check current conditions'}

Timestamp: ${timestamp}

IMMEDIATE ACTION REQUIRED: Please monitor local conditions and prepare evacuation procedures if necessary.

For assistance, contact: 09929184674

- ResQWave Disaster Management System`;

        const emailSubject = `ResQWave Emergency Alert - ${terminalName}`;
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                <!-- Header -->
                <div style="background: #6B9FF5; color: #ffffff; padding: 24px; border-bottom: 4px solid #1e40af;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">RESQWAVE EMERGENCY ALERT</h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #ffff;">Disaster Management System</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px; background: #f9fafb;">
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 24px;">
                        <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Alert Information</h2>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 0;">
                            <tr>
                                <td style="padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; width: 35%; color: #374151;">Terminal</td>
                                <td style="padding: 12px 16px; background: #ffffff; border: 1px solid #e5e7eb; color: #111827;">${terminalName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Location</td>
                                <td style="padding: 12px 16px; background: #ffffff; border: 1px solid #e5e7eb; color: #111827;">${location}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Alert Reason</td>
                                <td style="padding: 12px 16px; background: #ffffff; border: 1px solid #e5e7eb; color: #111827;">${alertReason || 'Potential flood risk detected'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Weather Conditions</td>
                                <td style="padding: 12px 16px; background: #ffffff; border: 1px solid #e5e7eb; color: #111827; white-space: pre-line;">${weatherConditions || 'Check current conditions'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Timestamp</td>
                                <td style="padding: 12px 16px; background: #ffffff; border: 1px solid #e5e7eb; color: #111827;">${timestamp}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Action Required Box -->
                    <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 24px 0 0 0;">
                        <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 15px;">IMMEDIATE ACTION REQUIRED</p>
                        <p style="margin: 8px 0 0 0; color: #7f1d1d; line-height: 1.6; font-size: 14px;">Please monitor local conditions and prepare evacuation procedures if necessary. Contact ResQWave dispatch for assistance.</p>
                    </div>
                    
                    <!-- Contact Information -->
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-top: 20px;">
                        <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">Emergency Hotline:</p>
                        <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">09929184674</p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #f3f4f6; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">
                        This is an automated alert from ResQWave Disaster Management System
                    </p>
                    <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                        Do not reply to this email. For assistance, contact the emergency hotline above.
                    </p>
                </div>
            </div>
        `;

        // Send SMS if phone number available
        let smsResult = null;
        if (focalPersonPhone) {
            try {
                smsResult = await sendSMS(focalPersonPhone, smsMessage);
                if (smsResult) {
                    console.log(`✅ SMS alert sent to ${focalPersonName} (${focalPersonPhone})`);
                }
            } catch (smsError) {
                console.error('❌ Error sending SMS:', smsError.message || smsError);
                smsResult = null; // Ensure it's null on error
            }
        }

        // Send Email if email available
        let emailResult = null;
        if (focalPersonEmail) {
            try {
                const sender = { email: process.env.EMAIL_USER, name: 'ResQWave Alert System' };
                const receivers = [{ email: focalPersonEmail, name: focalPersonName }];

                emailResult = await tranEmailApi.sendTransacEmail({
                    sender,
                    to: receivers,
                    subject: emailSubject,
                    htmlContent: emailHtml
                });
                console.log(`✅ Email alert sent to ${focalPersonName} (${focalPersonEmail})`);
            } catch (emailError) {
                console.error('Error sending email:', emailError);
            }
        }

        // Log alert in console (you can add database logging here)
        console.log(`📢 FOCAL PERSON ALERT - Terminal: ${terminalID}, Focal: ${focalPersonName}, SMS: ${smsResult ? 'Sent' : 'Failed/Skipped'}, Email: ${emailResult ? 'Sent' : 'Failed/Skipped'}`);

        // Return success response
        return res.status(200).json({
            status: 'success',
            message: 'Alert sent successfully',
            data: {
                focalPerson: {
                    name: focalPersonName,
                    phone: focalPersonPhone ? `${focalPersonPhone.slice(0, 4)}****${focalPersonPhone.slice(-3)}` : null,
                    email: focalPersonEmail ? focalPersonEmail.replace(/(.{2})(.*)(@.*)/, '$1****$3') : null
                },
                sent: {
                    sms: smsResult !== null,
                    email: emailResult !== null
                },
                timestamp
            }
        });

    } catch (error) {
        console.error('❌ Error alerting focal person:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to send alert',
            error: error.message
        });
    }
};

module.exports = {
    alertFocalPerson
};
