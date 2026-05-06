import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('provider zero setup guide', () => {
  test('covers each required external service from zero', () => {
    const guide = readText('docs/provider-zero-setup.md');

    for (const term of [
      'Google OAuth From Zero',
      'Axinom DRM And Encoding From Zero',
      'Zoom Meeting SDK From Zero',
      'Upstash Redis From Zero',
      'Azure Blob Storage From Zero',
      'Cloudflare R2/S3-Compatible Storage From Zero',
      'SMTP Provider From Zero',
      'Google reCAPTCHA From Zero',
      'Sentry From Zero',
      'Vercel Staging Env Entry',
    ]) {
      expect(guide).toContain(term);
    }
  });

  test('maps required repo environment variables', () => {
    const guide = readText('docs/provider-zero-setup.md');

    for (const envName of [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'AXINOM_COM_KEY_ID',
      'AXINOM_COM_KEY_SECRET',
      'ZOOM_MEETING_SDK_KEY',
      'ZOOM_MEETING_SDK_SECRET',
      'UPSTASH_REDIS_REST_URL',
      'AZURE_STORAGE_ACCOUNT',
      'R2_ACCESS_KEY_ID',
      'SMTP_HOST',
      'RECAPTCHA_SECRET_KEY',
      'SENTRY_DSN',
    ]) {
      expect(guide).toContain(envName);
    }
  });

  test('uses official references and secret-safe language', () => {
    const guide = readText('docs/provider-zero-setup.md');

    for (const term of [
      'https://developers.google.com/identity/protocols/oauth2/web-server',
      'https://docs.axinom.com/services/drm/',
      'https://marketplacefront.zoom.us/sdk/meeting/web/index.html',
      'https://upstash.com/docs/redis',
      'https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create',
      'https://developers.cloudflare.com/r2/get-started/s3/',
      'https://nodemailer.com/smtp',
      'https://cloud.google.com/recaptcha/docs/create-key-website',
      'https://docs.sentry.dev/product/sentry-basics/integrate-backend/getting-started/',
      'Do not paste real secrets',
    ]) {
      expect(guide).toContain(term);
    }
  });
});
