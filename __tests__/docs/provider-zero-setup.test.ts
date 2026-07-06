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
      'Tencent VOD Commercial DRM From Zero',
      'Zoom Meeting SDK From Zero',
      'Upstash Redis From Zero',
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
      'TENCENT_SECRET_ID',
      'TENCENT_SECRET_KEY',
      'TENCENT_VOD_PLAYBACK_KEY',
      'TENCENT_VOD_PROCEDURE_NAME',
      'ZOOM_MEETING_SDK_KEY',
      'ZOOM_MEETING_SDK_SECRET',
      'UPSTASH_REDIS_REST_URL',
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
      'https://cloud.tencent.com/document/product/266',
      'https://marketplacefront.zoom.us/sdk/meeting/web/index.html',
      'https://upstash.com/docs/redis',
      'https://nodemailer.com/smtp',
      'https://cloud.google.com/recaptcha/docs/create-key-website',
      'https://docs.sentry.dev/product/sentry-basics/integrate-backend/getting-started/',
      'Do not paste real secrets',
    ]) {
      expect(guide).toContain(term);
    }
  });

  test('documents concrete Tencent setup steps', () => {
    const guide = readText('docs/provider-zero-setup.md');

    for (const term of [
      'VOD application',
      'playback domain',
      'DRM-capable procedure',
      'https://<staging-domain>/api/webhook/tencent',
      'TENCENT_VOD_WEBHOOK_SIGN_KEY',
      'NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL',
      'npm run verify:tencent -- --strict',
    ]) {
      expect(guide).toContain(term);
    }
  });
});
