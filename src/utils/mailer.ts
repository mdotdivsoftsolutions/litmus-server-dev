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

export const sendLabWelcomeEmail = async (to: string, labName: string, plainPassword?: string) => {
  try {
    const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'http://localhost:5173/login';
    
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #0f172a; margin: 0;">Welcome to Litmus!</h1>
          <p style="color: #64748b; font-size: 16px; margin-top: 5px;">Your Official Diagnostic Partner</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
          <p style="color: #334155; font-size: 16px; margin-top: 0;">Hello <strong>${labName}</strong>,</p>
          <p style="color: #334155; font-size: 16px; line-height: 1.5;">You have been officially onboarded to the Litmus platform! We are thrilled to have you as a partner in delivering top-tier diagnostic services.</p>
        </div>

        <h3 style="color: #0f172a; margin-bottom: 15px;">Your Account Credentials</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f1f5f9; width: 120px; font-weight: bold; color: #475569;">Email / Login</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; color: #0f172a;">${to}</td>
          </tr>
          ${plainPassword ? `
          <tr>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f1f5f9; font-weight: bold; color: #475569;">Password</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; color: #0f172a;"><strong>${plainPassword}</strong></td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 12px; border: 1px solid #e2e8f0; background-color: #f1f5f9; font-weight: bold; color: #475569;">Password</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; color: #0f172a;"><em>Provided separately or set previously</em></td>
          </tr>
          `}
        </table>

        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${loginUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Your Account</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; color: #64748b; font-size: 13px; text-align: center;">
          <p style="margin: 0;">If you have any questions or need assistance, please contact our support team.</p>
          <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} Litmus. All rights reserved.</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Litmus Platform" <${process.env.SMTP_FROM || 'noreply@litmus.example.com'}>`,
      to,
      subject: 'Welcome to the Litmus Platform - Your Account Credentials',
      html: htmlContent,
    });
    logger.info(`Welcome email sent: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`Error sending welcome email: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
        logger.info(`DEV MODE: Welcome email logic executed for ${to}`);
        return true;
    }
    // Return false instead of throwing so it doesn't break the creation flow
    return false;
  }
};
