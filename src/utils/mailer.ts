import nodemailer from 'nodemailer';
import logger from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async (to: string, otp: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"Litmus Support" <${process.env.SMTP_FROM || 'noreply@litmus.example.com'}>`,
      to,
      subject: 'Your Litmus Registration OTP',
      text: `Your OTP for registration is: ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Litmus Registration</h2>
          <p>Your OTP for registration is: <strong>${otp}</strong></p>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    logger.info(`Message sent: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`Error sending email: ${error.message}`);
    // If SMTP is not configured properly, log the OTP in dev mode so the developer can proceed
    if (process.env.NODE_ENV === 'development') {
        logger.info(`DEV MODE: OTP for ${to} is ${otp}`);
        return true;
    }
    throw new Error('Could not send OTP email. Please try again later.');
  }
};
