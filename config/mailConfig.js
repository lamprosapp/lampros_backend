// mailConfig.js
import nodemailer from "nodemailer";

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER, // Use environment variables for security
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send an email with a PDF attachment
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {Buffer} pdfBuffer - PDF file as a buffer
 * @param {string} filename - Name of the attached file
 */
export const sendEmailWithAttachment = async (
  to,
  subject,
  text,
  pdfBuffer,
  filename
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to, // Recipient address
    subject, // Subject line
    text, // Plain text body
    attachments: [
      {
        filename,
        content: pdfBuffer,
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
