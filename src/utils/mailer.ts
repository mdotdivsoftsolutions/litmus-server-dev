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

export interface CustomerEmailData {
  customerName: string;
  bookingId?: string;
  productName?: string;
  testList?: string;
  sampleQty?: string;
  bookingDate?: string;
  receivedDate?: string;
  amount?: string;
  expectedDate?: string;
}

const sendGenericEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"Litmus Food Analytics" <${process.env.SMTP_FROM || 'noreply@litmus.example.com'}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`Error sending email: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
        logger.info(`DEV MODE: Email logic executed for ${to} | Subject: ${subject}`);
        return true;
    }
    return false;
  }
};

export const sendBookingConfirmedEmail = async (to: string, data: CustomerEmailData) => {
  const subject = 'Your Test Booking Has Been Confirmed';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <p>Dear ${data.customerName},</p>
      <p>Thank you for choosing Litmus Food Analytics.</p>
      <p>We are pleased to confirm that we have received your test booking.</p>
      <h3>Booking Details</h3>
      <ul style="list-style: none; padding: 0;">
        <li>• <strong>Booking ID:</strong> ${data.bookingId}</li>
        <li>• <strong>Product Name:</strong> ${data.productName}</li>
        <li>• <strong>Test(s) Selected:</strong> ${data.testList}</li>
        <li>• <strong>Sample Quantity:</strong> ${data.sampleQty}</li>
        <li>• <strong>Booking Date:</strong> ${data.bookingDate}</li>
      </ul>
      <p>Our team will coordinate with you regarding sample submission or collection.</p>
      <p>You can monitor the status of your testing through your customer dashboard at any time.</p>
      <p>Thank you for your trust in Litmus Food Analytics.</p>
      <p>Kind Regards,<br/>Litmus Food Analytics</p>
    </div>
`;
  return sendGenericEmail(to, subject, html);
};

export const sendSampleReceivedEmail = async (to: string, data: CustomerEmailData) => {
  const subject = 'Sample Received & Under Testing Successfully';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <p>Dear ${data.customerName},</p>
      <p>We are pleased to inform you that your sample has been received by our laboratory.</p>
      <p><strong>Booking ID:</strong> ${data.bookingId}<br/>
      <strong>Date Received:</strong> ${data.receivedDate}</p>
      <p>Your sample has now been registered into our Laboratory Information Management System (LIMS) and will proceed for testing as scheduled.</p>
      <p>You can continue tracking the progress through your customer dashboard.</p>
      <p>Regards,<br/>Litmus Food Analytics</p>
    </div>
`;
  return sendGenericEmail(to, subject, html);
};

export const sendTestReportReadyEmail = async (to: string, data: CustomerEmailData) => {
  const subject = `Your Test Report Is Ready ${data.bookingId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <p>Hello ${data.customerName},</p>
      <p>Great news!</p>
      <p>Your laboratory report is now ready.</p>
      <p><strong>Booking ID:</strong> ${data.bookingId}</p>
      <p>Please log in to your Litmus Customer Portal to view and download your report.</p>
      <p>Thank you for choosing,<br/>Litmus Food Analytics.</p>
    </div>
`;
  return sendGenericEmail(to, subject, html);
};

export const sendPaymentPendingEmail = async (to: string, data: CustomerEmailData) => {
  const subject = 'Complete Your Payment to Confirm Your Test Booking';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <p>Dear ${data.customerName},</p>
      <p>We noticed that you have selected one or more laboratory tests, but your payment is still pending.</p>
      <p>Your booking will only be confirmed after successful payment.</p>
      <h3>Cart Summary</h3>
      <ul style="list-style: none; padding: 0;">
        <li>• <strong>Tests Selected:</strong> ${data.testList}</li>
        <li>• <strong>Total Amount:</strong> ₹${data.amount}</li>
      </ul>
      <p>Please log in to your customer portal and complete your payment to proceed.</p>
      <p>If you have already made the payment, please ignore this email.</p>
      <p>Thank you for choosing,<br/>Litmus Food Analytics</p>
    </div>
`;
  return sendGenericEmail(to, subject, html);
};

export const sendRevisedTimelineEmail = async (to: string, data: CustomerEmailData) => {
  const subject = 'Revised Timeline for Your Test Report';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <p>Dear ${data.customerName},</p>
      <p>We would like to update you regarding your laboratory testing.</p>
      <p><strong>Booking ID:</strong> ${data.bookingId}<br/>
      <strong>Product:</strong> ${data.productName}</p>
      <p>Due to additional laboratory processing requirements, your report will be available later than originally anticipated.</p>
      <p><strong>Revised Expected Report Date:</strong> ${data.expectedDate}</p>
      <p>Our team is prioritizing your sample and will notify you as soon as the report is ready for download.</p>
      <p>We appreciate your patience and apologize for any inconvenience caused.</p>
      <p>Thank you for choosing Litmus Food Analytics.</p>
      <p>Kind Regards,<br/>Litmus Food Analytics</p>
    </div>
`;
  return sendGenericEmail(to, subject, html);
};

export const sendSampleCollectedEmail = async (to: string, data: CustomerEmailData) => {
  const subject = 'Sample Collected & Testing in Progress';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <p>Hello ${data.customerName},</p>
      <p>Your sample has been successfully collected and received by respective lab.</p>
      <p><strong>Booking ID:</strong> ${data.bookingId}</p>
      <p>The sample has now entered our laboratory process and testing will begin shortly.</p>
      <p>Track your sample status anytime through your customer portal.</p>
      <p>Thank you for choosing,<br/>Litmus Food Analytics</p>
    </div>
`;
  return sendGenericEmail(to, subject, html);
};

export const sendCollectionDelayedEmail = async (to: string, data: CustomerEmailData) => {
  const subject = 'Sample Collection Delayed';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <p>Hello ${data.customerName},</p>
      <p>We would like to inform you that there is a slight delay in the scheduled collection of your sample.</p>
      <p><strong>Booking ID:</strong> ${data.bookingId}</p>
      <p>Our team is actively coordinating the collection and will update you with the revised schedule as soon as possible.</p>
      <p>We apologize for the inconvenience and appreciate your patience.</p>
      <p>Thank you,<br/>Litmus Food Analytics</p>
    </div>
`;
  return sendGenericEmail(to, subject, html);
};

export const sendEmployeeWelcomeEmail = async (to: string, employeeName: string, plainPassword?: string) => {
  try {
    const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'http://localhost:5173/login';
    
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #0f172a; margin: 0;">Welcome to Litmus Admin!</h1>
          <p style="color: #64748b; font-size: 16px; margin-top: 5px;">Your Employee Account has been created</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
          <p style="color: #334155; font-size: 16px; margin-top: 0;">Hello <strong>${employeeName}</strong>,</p>
          <p style="color: #334155; font-size: 16px; line-height: 1.5;">You have been added as an employee to the Litmus admin panel.</p>
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
          <a href="${loginUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Admin Panel</a>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Litmus Platform" <${process.env.SMTP_FROM || 'noreply@litmus.example.com'}>`,
      to,
      subject: 'Welcome to Litmus Admin - Your Account Credentials',
      html: htmlContent,
    });
    logger.info(`Employee welcome email sent: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`Error sending employee welcome email: ${error.message}`);
    return false;
  }
};
