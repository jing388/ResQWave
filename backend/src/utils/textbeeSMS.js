require('dotenv').config();

const BASE_URL = 'https://api.textbee.dev/api/v1';
const API_KEY = process.env.TEXTBEE_API_KEY;
const DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;

const sendSMS = async (phoneNumber, message) => {
  try {
    if (!phoneNumber) {
      console.warn('sendSMS: No phone number provided');
      return;
    }

    // Format phone number: Replace leading 0 with +63
    const formattedNumber = phoneNumber.toString().startsWith('0') 
      ? '+63' + phoneNumber.toString().slice(1) 
      : phoneNumber;

    const response = await fetch(
      `${BASE_URL}/gateway/devices/${DEVICE_ID}/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          recipients: [formattedNumber],
          message: message
        })
      }
    );

    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TextBee error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`SMS sent to ${formattedNumber}:`, data);
    return data;
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    return null;
  }
};

module.exports = { sendSMS };
