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

/** Parse `Name <addr@x>` (or a bare address) into ZeptoMail's from shape. */
function parseFrom(from: string): { address: string; name: string } {
  const m = /^\s*"?([^"<]*?)"?\s*<\s*([^>]+)\s*>\s*$/.exec(from);
  if (m) return { name: m[1]!.trim(), address: m[2]!.trim() };
  return { name: '', address: from.trim() };
}

/** Send via ZeptoMail's HTTPS API (works where SMTP ports are blocked). */
async function sendViaZeptoMail(input: SendEmailInput, from: string): Promise<void> {
  const env = getServerEnv();
  const token = env.ZEPTOMAIL_TOKEN!;
  const authorization = token.startsWith('Zoho-') ? token : `Zoho-enczapikey ${token}`;
  const res = await fetch(env.ZEPTOMAIL_API_URL, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      from: parseFrom(from),
      to: [{ email_address: { address: input.to } }],
      subject: input.subject,
      htmlbody: input.html,
      ...(input.text ? { textbody: input.text } : {}),
    }),
  });
  const detail = await res.text().catch(() => '');
  console.log(`[email:zeptomail] to=${input.to} status=${res.status} body=${detail.slice(0, 600)}`);
  if (!res.ok) {
    throw new Error(`ZeptoMail API ${res.status}: ${detail.slice(0, 500)}`);
  }
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

  console.log(`[email] sending via ${env.MAIL_DRIVER} to=${to} subject="${subject}"`);

  if (env.MAIL_DRIVER === 'zeptomail') {
    await sendViaZeptoMail({ to, subject, html, text }, env.SMTP_FROM);
    return;
  }

  await getTransporter().sendMail({ from: env.SMTP_FROM, to, subject, html, text });
}
