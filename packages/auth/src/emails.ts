import { sendEmail } from './mailer';

const wrap = (heading: string, body: string, ctaLabel: string, ctaUrl: string) => `
  <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
    <h1 style="font-size: 20px;">${heading}</h1>
    <p style="font-size: 14px; line-height: 1.6;">${body}</p>
    <p style="margin: 24px 0;">
      <a href="${ctaUrl}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;">${ctaLabel}</a>
    </p>
    <p style="font-size: 12px; color: #64748b;">If the button doesn't work, paste this link into your browser:<br>${ctaUrl}</p>
  </div>
`;

export function sendVerificationEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: 'Verify your Liberscript email',
    html: wrap('Confirm your email', 'Welcome to Liberscript! Confirm your email to start writing.', 'Verify email', url),
    text: `Verify your Liberscript email: ${url}`,
  });
}

export function sendResetPasswordEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: 'Reset your Liberscript password',
    html: wrap('Reset your password', 'We received a request to reset your password. This link expires in 1 hour.', 'Reset password', url),
    text: `Reset your Liberscript password: ${url}`,
  });
}

export function sendInvitationEmail(to: string, org: string, url: string) {
  return sendEmail({
    to,
    subject: `You're invited to join ${org} on Liberscript`,
    html: wrap('Team invitation', `You've been invited to collaborate on <strong>${org}</strong> in Liberscript.`, 'Accept invitation', url),
    text: `You've been invited to join ${org} on Liberscript: ${url}`,
  });
}
