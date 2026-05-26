import process from 'node:process';
import path from 'node:path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const sendSmoke = process.argv.includes('--send');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes('example.invalid') || value.includes('replace-with')) {
    throw new Error(`${name} missing or placeholder`);
  }
  return value;
}

async function main() {
  const host = requireEnv('SMTP_HOST');
  const port = Number(requireEnv('SMTP_PORT'));
  const secure = process.env.SMTP_SECURE === 'true';
  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');
  const from = requireEnv('SMTP_FROM');
  const adminEmail = requireEnv('ADMIN_EMAIL');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.verify();
  console.log('OK SMTP connection verified');

  if (!sendSmoke) {
    console.log('SKIP smoke email send. Re-run with --send to send to ADMIN_EMAIL.');
    return;
  }

  const info = await transporter.sendMail({
    from,
    to: adminEmail,
    subject: 'Secure Streaming Platform SMTP smoke',
    text: 'SMTP smoke test from secure-streaming-platform. No secrets are included in this message.',
  });

  console.log(`OK SMTP smoke email sent: ${info.messageId}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'SMTP verification failed';
  console.error(`FAIL verify:email: ${message}`);
  process.exit(1);
});
