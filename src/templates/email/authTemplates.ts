import { renderLitmusEmailLayout } from './emailLayout';

export function renderOtpEmail(to: string, otp: string): string {
  return renderLitmusEmailLayout({
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
}

export function renderLabWelcomeEmail(to: string, labName: string, plainPassword?: string): string {
  const siteUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const loginUrl = process.env.LAB_FRONTEND_URL || `${siteUrl}/login`;

  return renderLitmusEmailLayout({
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
}

export function renderEmployeeWelcomeEmail(
  to: string,
  employeeName: string,
  plainPassword?: string,
  portalName: string = 'Litmus Admin'
): string {
  const siteUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const loginUrl = portalName === 'Litmus Admin'
    ? (process.env.ADMIN_FRONTEND_URL || `${siteUrl}/login`)
    : (process.env.LAB_FRONTEND_URL || `${siteUrl}/login`);

  return renderLitmusEmailLayout({
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
}
