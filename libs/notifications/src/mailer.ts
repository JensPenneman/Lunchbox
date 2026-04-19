import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST ?? 'localhost';
const port = Number(process.env.SMTP_PORT ?? 1025);
const from = process.env.SMTP_FROM ?? 'Lunchbox <noreply@lunchbox.test>';

export const mailer = nodemailer.createTransport({
  host,
  port,
  secure: false,
  auth: undefined,
  ignoreTLS: true,
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  try {
    await mailer.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    });
  } catch (err) {
    // In dev, never let an email failure block an order — just log.
    // eslint-disable-next-line no-console
    console.warn('[notifications] failed to send mail', err instanceof Error ? err.message : err);
  }
}
