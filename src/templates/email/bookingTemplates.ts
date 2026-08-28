import { renderLitmusEmailLayout, formatCurrency, CustomerEmailData } from './emailLayout';

const SITE_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export function renderBookingConfirmedEmail(to: string, data: CustomerEmailData): string {
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  return renderLitmusEmailLayout({
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
            <td style="padding: 6px 0; font-weight: 800; color: #0f172a;">${formatCurrency(data.amount)} (Incl. GST)</td>
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
}

export function renderSampleCollectedEmail(to: string, data: CustomerEmailData): string {
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  return renderLitmusEmailLayout({
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
}

export function renderSampleReceivedEmail(to: string, data: CustomerEmailData): string {
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  return renderLitmusEmailLayout({
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
}

export function renderTestReportReadyEmail(to: string, data: CustomerEmailData): string {
  const reportUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/reports`;

  return renderLitmusEmailLayout({
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
}

export function renderPaymentPendingEmail(to: string, data: CustomerEmailData): string {
  const checkoutUrl = `${SITE_URL}/cart`;

  return renderLitmusEmailLayout({
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
            <td style="padding: 5px 0; font-weight: 800; color: #004B60;">${formatCurrency(data.amount)}</td>
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
}

export function renderRevisedTimelineEmail(to: string, data: CustomerEmailData): string {
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  return renderLitmusEmailLayout({
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
}

export function renderCollectionDelayedEmail(to: string, data: CustomerEmailData): string {
  const orderUrl = data.bookingId ? `${SITE_URL}/orders/${data.bookingId}` : `${SITE_URL}/orders`;

  return renderLitmusEmailLayout({
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
}
