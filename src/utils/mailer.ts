import nodemailer from 'nodemailer';
import logger from './logger';
import { CustomerEmailData, htmlToPlainText } from '../templates/email/emailLayout';
import {
  renderOtpEmail,
  renderLabWelcomeEmail,
  renderEmployeeWelcomeEmail,
} from '../templates/email/authTemplates';
import {
  renderBookingConfirmedEmail,
  renderSampleCollectedEmail,
  renderSampleReceivedEmail,
  renderTestReportReadyEmail,
  renderPaymentPendingEmail,
  renderRevisedTimelineEmail,
  renderCollectionDelayedEmail,
} from '../templates/email/bookingTemplates';

export { CustomerEmailData };

// ─────────────────────────────────────────────────────────────────────────────
// SMTP Transporter Configuration
// ─────────────────────────────────────────────────────────────────────────────
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const isSecure = smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: smtpPort,
  secure: isSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

const DEFAULT_SENDER = `"Litmus Food Analytics" <${process.env.SMTP_FROM || 'noreply@litmustest.in'}>`;

// ─────────────────────────────────────────────────────────────────────────────
// Generic Email Dispatch Helper
// ─────────────────────────────────────────────────────────────────────────────
export const sendGenericEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments: any[] = []
): Promise<boolean> => {
  try {
    const text = htmlToPlainText(html);
    const replyToAddress = process.env.SMTP_FROM || 'support@litmuslabs.in';

    const info = await transporter.sendMail({
      from: DEFAULT_SENDER,
      to,
      replyTo: replyToAddress,
      subject,
      text,
      html,
      attachments,
      headers: {
        'X-Entity-Ref-ID': Date.now().toString(),
        'X-Mailer': 'Litmus Diagnostic Notification Engine',
      },
    });
    logger.info(`[Mailer] Message sent to ${to} | Subject: "${subject}" | ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`[Mailer] Error sending email to ${to}: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[Mailer] DEV MODE: Email logic executed for ${to} | Subject: "${subject}"`);
      return true;
    }
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Email Dispatch Methods
// ─────────────────────────────────────────────────────────────────────────────
export const sendOtpEmail = async (to: string, otp: string): Promise<boolean> => {
  const subject = `Your Litmus verification code: ${otp}`;
  const html = renderOtpEmail(to, otp);
  return sendGenericEmail(to, subject, html);
};

export const sendBookingConfirmedEmail = async (to: string, data: CustomerEmailData): Promise<boolean> => {
  const subject = `Booking Confirmed #${data.bookingId || ''} - Litmus Diagnostics`;
  const html = renderBookingConfirmedEmail(to, data);
  return sendGenericEmail(to, subject, html);
};

export const sendSampleCollectedEmail = async (to: string, data: CustomerEmailData): Promise<boolean> => {
  const subject = `Sample Collected & Testing in Progress #${data.bookingId || ''}`;
  const html = renderSampleCollectedEmail(to, data);
  return sendGenericEmail(to, subject, html);
};

export const sendSampleReceivedEmail = async (to: string, data: CustomerEmailData): Promise<boolean> => {
  const subject = `Sample Received & Under Testing Successfully #${data.bookingId || ''}`;
  const html = renderSampleReceivedEmail(to, data);
  return sendGenericEmail(to, subject, html);
};

export const sendTestReportReadyEmail = async (to: string, data: CustomerEmailData): Promise<boolean> => {
  const subject = `Official Test Report Published #${data.bookingId || ''} - Litmus`;
  const html = renderTestReportReadyEmail(to, data);
  return sendGenericEmail(to, subject, html);
};

export const sendPaymentPendingEmail = async (to: string, data: CustomerEmailData): Promise<boolean> => {
  const subject = 'Complete Your Payment to Confirm Your Test Booking';
  const html = renderPaymentPendingEmail(to, data);
  return sendGenericEmail(to, subject, html);
};

export const sendRevisedTimelineEmail = async (to: string, data: CustomerEmailData): Promise<boolean> => {
  const subject = `Revised Timeline for Your Test Report #${data.bookingId || ''}`;
  const html = renderRevisedTimelineEmail(to, data);
  return sendGenericEmail(to, subject, html);
};

export const sendCollectionDelayedEmail = async (to: string, data: CustomerEmailData): Promise<boolean> => {
  const subject = `Sample Collection Rescheduled #${data.bookingId || ''}`;
  const html = renderCollectionDelayedEmail(to, data);
  return sendGenericEmail(to, subject, html);
};

export const sendLabWelcomeEmail = async (to: string, labName: string, plainPassword?: string): Promise<boolean> => {
  const subject = 'Welcome to Litmus Platform - Your Laboratory Partner Account';
  const html = renderLabWelcomeEmail(to, labName, plainPassword);
  return sendGenericEmail(to, subject, html);
};

export const sendEmployeeWelcomeEmail = async (
  to: string,
  employeeName: string,
  plainPassword?: string,
  portalName: string = 'Litmus Admin'
): Promise<boolean> => {
  const subject = `Your ${portalName} Account has been Provisioned`;
  const html = renderEmployeeWelcomeEmail(to, employeeName, plainPassword, portalName);
  return sendGenericEmail(to, subject, html);
};
