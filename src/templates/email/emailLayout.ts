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

export interface EmailLayoutOptions {
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

export function formatCurrency(amount?: string | number): string {
  if (amount === undefined || amount === null || amount === '') return '';
  if (typeof amount === 'number') {
    return isNaN(amount) ? '' : `₹${amount.toLocaleString('en-IN')}`;
  }
  const cleanStr = String(amount).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanStr);
  if (!isNaN(num)) {
    return `₹${num.toLocaleString('en-IN')}`;
  }
  return String(amount).startsWith('₹') ? String(amount) : `₹${amount}`;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '•')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function renderLitmusEmailLayout({
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
  const siteUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const helpUrl = `${siteUrl}/help`;
  const termsUrl = `${siteUrl}/terms`;
  const privacyUrl = `${siteUrl}/privacy`;

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
            <td style="padding: 28px 36px 16px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://litmuslabs.sgp1.digitaloceanspaces.com/email/litmus-brand-logo.png" alt="Litmus Food Analytics" width="115" height="44" border="0" style="display: block; width: 115px; height: auto; max-width: 115px; border: 0; outline: none; text-decoration: none;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 36px 36px 36px;">
              <!-- Headline -->
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0; line-height: 1.4; letter-spacing: -0.15px;">
                ${headline}
              </div>

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
