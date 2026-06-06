import nodemailer, { type Transporter } from 'nodemailer';
import { getServerEnv } from '@liberscript/core';

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE } = getServerEnv();
    const secure = SMTP_SECURE || SMTP_PORT === 465;
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure,
      // Force STARTTLS upgrade on submission ports (e.g. 587, ZeptoMail).
      requireTLS: !secure,
      ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASSWORD } } : {}),
    });
  }
  return transporter;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a transactional email. With MAIL_DRIVER=log (the dev default), the
 * message — including any action link — is printed to the console instead of
 * being sent, so auth flows are testable with no SMTP server.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  const env = getServerEnv();

  if (env.MAIL_DRIVER === 'log') {
    const body = text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n📧 [email:log] to=${to}\n   subject: ${subject}\n   ${body}\n`);
    return;
  }

  await getTransporter().sendMail({ from: env.SMTP_FROM, to, subject, html, text });
}
