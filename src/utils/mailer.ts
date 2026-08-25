import nodemailer from 'nodemailer';
import logger from './logger';

// ─────────────────────────────────────────────────────────────────────────────
// Brevo (Sendinblue) & Standard SMTP Transporter Configuration
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
const SITE_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// Customer Data Interface
// ─────────────────────────────────────────────────────────────────────────────
export interface CustomerEmailData {
  customerName: string;
  bookingId?: string;
  productName?: string;
  testList?: string;
  sampleQty?: string;
  bookingDate?: string;
  receivedDate?: string;
  amount?: string | number;
  expectedDate?: string;
  labName?: string;
  collectorName?: string;
  collectorPhone?: string;
  trackingId?: string;
  courierName?: string;
  reportUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Litmus Email Layout (Netflix-Style Clean Minimalist Structure)
// ─────────────────────────────────────────────────────────────────────────────
interface EmailLayoutOptions {
  title: string;
  headline: string;
  recipientName: string;
  introText: string;
  calloutHtml?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryHtml?: string;
  recipientEmail: string;
}

function renderLitmusEmailLayout({
  title,
  headline,
  recipientName,
  introText,
  calloutHtml,
  ctaText,
  ctaUrl,
  secondaryHtml,
  recipientEmail,
}: EmailLayoutOptions): string {
  const currentYear = new Date().getFullYear();
  const helpUrl = `${SITE_URL}/help`;
  const termsUrl = `${SITE_URL}/terms`;
  const privacyUrl = `${SITE_URL}/privacy`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f6f8; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 32px 36px 20px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="background-color: #004B60; color: #ffffff; width: 36px; height: 36px; border-radius: 8px; text-align: center; line-height: 36px; font-weight: 900; font-size: 20px;">L</div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 10px;">
                          <span style="font-size: 22px; font-weight: 800; color: #004B60; letter-spacing: -0.4px;">litmus</span>
                          <span style="font-size: 9px; font-weight: 700; color: #64748b; display: block; text-transform: uppercase; letter-spacing: 0.8px; margin-top: -2px;">Food Analytics &amp; Diagnostics</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 36px 36px 36px;">
              <!-- Headline -->
              <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3; letter-spacing: -0.3px;">
                ${headline}
              </h1>

              <!-- Greeting -->
              <p style="font-size: 14px; font-weight: 600; color: #334155; margin: 0 0 12px 0;">
                Hi ${recipientName || 'there'},
              </p>

              <!-- Intro Message -->
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                ${introText}
              </p>

              <!-- Highlighted Callout Box (If present) -->
              ${calloutHtml ? `
              <div style="margin: 0 0 24px 0;">
                ${calloutHtml}
              </div>
              ` : ''}

              <!-- Primary CTA Button (If present) -->
              ${ctaText && ctaUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="left">
                    <a href="${ctaUrl}" target="_blank" style="background-color: #004B60; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 8px; display: inline-block; text-align: center; box-shadow: 0 2px 6px rgba(0, 75, 96, 0.25);">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Secondary Details / Security Notice (If present) -->
              ${secondaryHtml ? `
              <div style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 0 0 20px 0;">
                ${secondaryHtml}
              </div>
              ` : ''}

              <!-- Sign-off -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 13px; color: #475569;">
                <p style="margin: 0 0 2px 0; font-weight: 600;">We&apos;re here to help,</p>
                <p style="margin: 0; color: #004B60; font-weight: 700;">The Litmus Quality Assurance Team</p>
              </div>
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="padding-bottom: 12px;">
                    <a href="${helpUrl}" style="color: #64748b; text-decoration: none; font-weight: 600; margin-right: 14px;">Help Center</a>
                    <a href="${termsUrl}" style="color: #64748b; text-decoration: none; font-weight: 600; margin-right: 14px;">Terms of Service</a>
                    <a href="${privacyUrl}" style="color: #64748b; text-decoration: none; font-weight: 600;">Privacy Policy</a>
                  </td>
                </tr>
                <tr>
                  <td align="left">
                    <p style="margin: 0 0 4px 0;">This transactional message was sent to <strong style="color: #64748b;">${recipientEmail}</strong> as part of your Litmus account activity.</p>
                    <p style="margin: 0;">&copy; ${currentYear} Litmus Food Analytics. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Email Dispatch Helper
// ─────────────────────────────────────────────────────────────────────────────
const sendGenericEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: DEFAULT_SENDER,
      to,
      subject,
      html,
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
// 1. Registration / Login OTP Email (Netflix-Style Access Code)
// ─────────────────────────────────────────────────────────────────────────────
export const sendOtpEmail = async (to: string, otp: string) => {
  const subject = `Your Litmus verification code: ${otp}`;
  const html = renderLitmusEmailLayout({
    title: 'Your Litmus Verification Code',
    headline: 'Your temporary verification code',
    recipientName: 'Valued User',
    introText: 'We received a request to verify your email address on Litmus Food Analytics. Use the temporary access code below to complete your verification.',
    calloutHtml: `
      <div style="background-color: #f0f7f9; border: 1.5px dashed #004B60; border-radius: 10px; padding: 22px; text-align: center;">
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #004B60; font-family: monospace; line-height: 1;">
          ${otp}
        </div>
        <p style="font-size: 11px; font-weight: 700; color: #004B60; text-transform: uppercase; letter-spacing: 0.5px; margin: 10px 0 0 0;">
          Valid for 10 minutes &bull; Do not share with anyone
        </p>
      </div>
    `,
    secondaryHtml: `
      <p style="margin: 0 0 6px 0;"><strong style="color: #334155;">Keep your account secure:</strong> If you did not initiate this request, someone else may have entered your email by mistake. You can safely ignore this email.</p>
    `,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Booking Confirmed Email (Order Confirmation)
// ─────────────────────────────────────────────────────────────────────────────
export const sendBookingConfirmedEmail = async (to: string, data: CustomerEmailData) => {
  const subject = `Booking Confirmed #${data.bookingId || ''} - Litmus Diagnostics`;
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  const html = renderLitmusEmailLayout({
    title: 'Booking Confirmed - Litmus Food Analytics',
    headline: 'Your diagnostic test booking is confirmed',
    recipientName: data.customerName,
    introText: 'Thank you for choosing Litmus Food Analytics. We have received and confirmed your test booking. Our operations desk is preparing your sample intake and diagnostic scheduling.',
    calloutHtml: `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #334155;">
          ${data.bookingId ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Booking ID:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #004B60; font-family: monospace;">#${data.bookingId}</td>
          </tr>
          ` : ''}
          ${data.productName ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Product / Sample:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${data.productName}</td>
          </tr>
          ` : ''}
          ${data.testList ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Selected Tests:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #334155;">${data.testList}</td>
          </tr>
          ` : ''}
          ${data.sampleQty ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Sample Quantity:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #334155;">${data.sampleQty}</td>
          </tr>
          ` : ''}
          ${data.amount ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Total Paid:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #0f172a;">₹${Number(data.amount).toLocaleString('en-IN')} (Incl. GST)</td>
          </tr>
          ` : ''}
          ${data.bookingDate ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date Placed:</td>
            <td style="padding: 6px 0; font-weight: 600; color: #334155;">${data.bookingDate}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `,
    ctaText: 'View Booking & Track Progress',
    ctaUrl: orderUrl,
    secondaryHtml: `
      <p style="margin: 0;"><strong style="color: #334155;">Next Steps:</strong> Please ensure your sealed samples are prepared according to standard packaging guidelines. Our assigned logistics partner or courier intake will verify seals upon handover.</p>
    `,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sample Logistics & Field Collection (Shipping Updates)
// ─────────────────────────────────────────────────────────────────────────────
export const sendSampleCollectedEmail = async (to: string, data: CustomerEmailData) => {
  const subject = `Sample Collected & Testing in Progress #${data.bookingId || ''}`;
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  const html = renderLitmusEmailLayout({
    title: 'Sample Collected - Litmus',
    headline: 'Your sample has been collected successfully',
    recipientName: data.customerName,
    introText: 'Your diagnostic sample has been safely collected and is now en route to our accredited laboratory facility under regulated transport conditions.',
    calloutHtml: `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #334155;">
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600; width: 35%;">Booking ID:</td>
            <td style="padding: 5px 0; font-weight: 800; color: #004B60; font-family: monospace;">#${data.bookingId}</td>
          </tr>
          ${data.collectorName ? `
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Collector:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">${data.collectorName} ${data.collectorPhone ? `(${data.collectorPhone})` : ''}</td>
          </tr>
          ` : ''}
          ${data.trackingId ? `
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Courier AWB:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">${data.trackingId} ${data.courierName ? `(${data.courierName})` : ''}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Status:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #004B60;">Collected &bull; Moving to Testing Lab</td>
          </tr>
        </table>
      </div>
    `,
    ctaText: 'Track Sample Timeline',
    ctaUrl: orderUrl,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sample Received by Laboratory (Under Testing / Order Processing)
// ─────────────────────────────────────────────────────────────────────────────
export const sendSampleReceivedEmail = async (to: string, data: CustomerEmailData) => {
  const subject = `Sample Received & Under Testing Successfully #${data.bookingId || ''}`;
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  const html = renderLitmusEmailLayout({
    title: 'Sample Received - Litmus',
    headline: 'Sample received & registered in LIMS',
    recipientName: data.customerName,
    introText: 'Your sample has physically arrived at our laboratory and is registered in the Laboratory Information Management System (LIMS). Certified analysts are now conducting the diagnostic procedures.',
    calloutHtml: `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #334155;">
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600; width: 35%;">Booking ID:</td>
            <td style="padding: 5px 0; font-weight: 800; color: #004B60; font-family: monospace;">#${data.bookingId}</td>
          </tr>
          ${data.labName ? `
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Testing Lab:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">${data.labName}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Intake Date:</td>
            <td style="padding: 5px 0; font-weight: 600; color: #334155;">${data.receivedDate || new Date().toLocaleDateString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Status:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #004B60;">Diagnostic Analysis In Progress</td>
          </tr>
        </table>
      </div>
    `,
    ctaText: 'View Laboratory Status',
    ctaUrl: orderUrl,
    secondaryHtml: `
      <p style="margin: 0;">You will receive an instant notification with your certified PDF report as soon as all parameter assays and supervisory reviews are completed.</p>
    `,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Test Report Ready & Published (Delivery Updates)
// ─────────────────────────────────────────────────────────────────────────────
export const sendTestReportReadyEmail = async (to: string, data: CustomerEmailData) => {
  const subject = `Official Test Report Published #${data.bookingId || ''} - Litmus`;
  const reportUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/reports`;

  const html = renderLitmusEmailLayout({
    title: 'Test Report Published - Litmus',
    headline: 'Your certified test report is ready for download',
    recipientName: data.customerName,
    introText: 'Great news! Testing and quality verification for your booking has been completed. Your official, NABL-accredited diagnostic report is now available on your dashboard.',
    calloutHtml: `
      <div style="background-color: #f0f7f9; border: 1.5px solid #004B60; border-radius: 10px; padding: 20px; text-align: center;">
        <div style="font-size: 14px; font-weight: 800; color: #004B60; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          ✓ Quality Verification Completed
        </div>
        <p style="font-size: 13px; color: #004B60; margin: 0; font-weight: 600;">
          Booking #${data.bookingId || ''} &bull; Certified by Senior Pathologist / Quality Officer
        </p>
      </div>
    `,
    ctaText: 'View & Download Report PDF',
    ctaUrl: reportUrl,
    secondaryHtml: `
      <p style="margin: 0;">Your digital test report is cryptographically signed and stored securely in your dashboard for permanent record-keeping.</p>
    `,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Abandoned Cart / Payment Pending Notification
// ─────────────────────────────────────────────────────────────────────────────
export const sendPaymentPendingEmail = async (to: string, data: CustomerEmailData) => {
  const subject = 'Complete Your Payment to Confirm Your Test Booking';
  const checkoutUrl = `${SITE_URL}/cart`;

  const html = renderLitmusEmailLayout({
    title: 'Complete Your Booking - Litmus',
    headline: 'You have pending diagnostic tests in your cart',
    recipientName: data.customerName,
    introText: 'We noticed that you selected diagnostic tests on Litmus, but the checkout process has not been completed. Secure your priority testing slot today.',
    calloutHtml: `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #334155;">
          ${data.testList ? `
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600; width: 35%;">Pending Tests:</td>
            <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">${data.testList}</td>
          </tr>
          ` : ''}
          ${data.amount ? `
          <tr>
            <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Cart Total:</td>
            <td style="padding: 5px 0; font-weight: 800; color: #004B60;">₹${Number(data.amount).toLocaleString('en-IN')}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `,
    ctaText: 'Complete Your Order Now',
    ctaUrl: checkoutUrl,
    secondaryHtml: `
      <p style="margin: 0;">If you have already finalized this booking or completed payment under another session, you may disregard this notice.</p>
    `,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Timeline SLA Revision Notice
// ─────────────────────────────────────────────────────────────────────────────
export const sendRevisedTimelineEmail = async (to: string, data: CustomerEmailData) => {
  const subject = `Revised Timeline for Your Test Report #${data.bookingId || ''}`;
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  const html = renderLitmusEmailLayout({
    title: 'Timeline Revision - Litmus',
    headline: 'Update regarding your testing timeline',
    recipientName: data.customerName,
    introText: `We are reaching out with an update on Booking #${data.bookingId || ''}. Due to specialized confirmatory assays and strict quality verification protocols, additional laboratory processing time is required.`,
    calloutHtml: `
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 18px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #78350f;">
          <tr>
            <td style="padding: 4px 0; font-weight: 600; width: 40%;">Booking ID:</td>
            <td style="padding: 4px 0; font-weight: 800;">#${data.bookingId}</td>
          </tr>
          ${data.expectedDate ? `
          <tr>
            <td style="padding: 4px 0; font-weight: 600;">Revised Expected Date:</td>
            <td style="padding: 4px 0; font-weight: 800; color: #b45309;">${data.expectedDate}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `,
    ctaText: 'View Updated Timeline',
    ctaUrl: orderUrl,
    secondaryHtml: `
      <p style="margin: 0;">Our laboratory team is actively prioritizing your test assay. We apologize for any inconvenience and appreciate your patience in ensuring clinical accuracy.</p>
    `,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. Sample Collection Delayed Notice
// ─────────────────────────────────────────────────────────────────────────────
export const sendCollectionDelayedEmail = async (to: string, data: CustomerEmailData) => {
  const subject = `Sample Collection Rescheduled #${data.bookingId || ''}`;
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  const html = renderLitmusEmailLayout({
    title: 'Collection Update - Litmus',
    headline: 'Update on your sample pickup schedule',
    recipientName: data.customerName,
    introText: `We would like to inform you that there is a slight rescheduling in the field collection window for Booking #${data.bookingId || ''}.`,
    calloutHtml: `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px;">
        <p style="font-size: 13px; color: #334155; margin: 0; font-weight: 600;">
          Our logistics desk is coordinating with the field officer and will confirm your updated pickup slot shortly.
        </p>
      </div>
    `,
    ctaText: 'Check Collection Details',
    ctaUrl: orderUrl,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. Laboratory Partner Onboarding Email
// ─────────────────────────────────────────────────────────────────────────────
export const sendLabWelcomeEmail = async (to: string, labName: string, plainPassword?: string) => {
  const loginUrl = process.env.LAB_FRONTEND_URL || `${SITE_URL}/login`;
  const subject = 'Welcome to Litmus Platform - Your Laboratory Partner Account';

  const html = renderLitmusEmailLayout({
    title: 'Welcome to Litmus - Lab Partner',
    headline: 'Welcome to the Litmus Laboratory Network',
    recipientName: labName,
    introText: 'Your laboratory has been officially onboarded to the Litmus diagnostic network. You can now access your dedicated LIMS portal to receive orders, manage test allocations, and submit verified reports.',
    calloutHtml: `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px;">
        <h4 style="font-size: 12px; font-weight: 800; color: #004B60; text-transform: uppercase; margin: 0 0 10px 0;">Partner Access Credentials</h4>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Login Email:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${to}</td>
          </tr>
          ${plainPassword ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Initial Password:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #004B60; font-family: monospace;">${plainPassword}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `,
    ctaText: 'Access Laboratory Portal',
    ctaUrl: loginUrl,
    secondaryHtml: `
      <p style="margin: 0;"><strong style="color: #334155;">Security Note:</strong> Please change your temporary password immediately upon your initial login.</p>
    `,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. Employee / Staff Provisioning Email
// ─────────────────────────────────────────────────────────────────────────────
export const sendEmployeeWelcomeEmail = async (
  to: string,
  employeeName: string,
  plainPassword?: string,
  portalName: string = 'Litmus Admin'
) => {
  const loginUrl = portalName === 'Litmus Admin'
    ? (process.env.ADMIN_FRONTEND_URL || `${SITE_URL}/login`)
    : (process.env.LAB_FRONTEND_URL || `${SITE_URL}/login`);

  const subject = `Your ${portalName} Account has been Provisioned`;

  const html = renderLitmusEmailLayout({
    title: `Account Provisioned - ${portalName}`,
    headline: `Welcome to ${portalName}`,
    recipientName: employeeName,
    introText: `An employee account has been created for you on the ${portalName} platform. Please find your login credentials below.`,
    calloutHtml: `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px;">
        <h4 style="font-size: 12px; font-weight: 800; color: #004B60; text-transform: uppercase; margin: 0 0 10px 0;">Account Credentials</h4>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Username / Email:</td>
            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${to}</td>
          </tr>
          ${plainPassword ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Temporary Password:</td>
            <td style="padding: 6px 0; font-weight: 800; color: #004B60; font-family: monospace;">${plainPassword}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `,
    ctaText: `Access ${portalName}`,
    ctaUrl: loginUrl,
    secondaryHtml: `
      <p style="margin: 0;"><strong style="color: #334155;">Security Notice:</strong> Keep your credentials confidential. For security reasons, update your password after your first sign-in.</p>
    `,
    recipientEmail: to,
  });

  return sendGenericEmail(to, subject, html);
};

