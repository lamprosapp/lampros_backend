import { Vonage } from '@vonage/server-sdk';
import {logger} from '../config/loggingConfig.js';
import axios from 'axios'

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});

// export const sendSmsvia2fact = (to, message, next) => {
//   return new Promise((resolve, reject) => {
//     vonage.sms.send({ to, from: process.env.VONAGE_PHONE_NUMBER, text: message }, (err, responseData) => {
//       if (err) {
//         logger.error(err);
//         reject(err);
//       } else {
//         resolve(responseData)
//       }
//     });
//   });
// };

export const sendSmsvia2fact = (to, message, next) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Remove '+' from the phone number if present
      let formattedNumber = to.replace('+', '');

      // Ensure phone number starts with '91'
      if (!formattedNumber.startsWith('91')) {
        formattedNumber = `91${formattedNumber}`;
      }

      // Construct the API URL
      const apiUrl = `https://whatsapp-bot-q1u3.onrender.com/send/${formattedNumber}/${message}`;

      // Send the request using axios
      const response = await axios.get(apiUrl);

      resolve(response.data); // Resolve with the response data
    } catch (err) {
      logger.error(err);
      reject(err); // Reject in case of an error
    }
  });
};


// export const sendSmsvia2fact = async (phoneNumber, otp) => {
//   const apiKey = process.env.TWO_FACTOR_SMS_API_KEY; // Your 2Factor API key
//   const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phoneNumber}/${otp}`;

//   try {
//     const response = await fetch(url, {
//       method: 'GET',
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to send OTP: ${response.statusText}`);
//     }

//     const data = await response.json();

//     if (data.Status === 'Success') {
//       logger.info(`OTP sent successfully to ${phoneNumber}`);
//       return data;
//     } else {
//       throw new Error(`Error from 2Factor: ${data.Details}`);
//     }
//   } catch (error) {
//     logger.error(`Error sending OTP: ${error.message}`);
//     throw error;
//   }
// };

