import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const envExamplePath = path.join(rootDir, '.env.example');
const envMatrixPath = path.join(rootDir, 'docs', 'env-matrix.md');

const requiredStarterVariables = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'AXINOM_COM_KEY_ID',
  'AXINOM_COM_KEY_SECRET',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'ZOOM_MEETING_SDK_KEY',
  'ZOOM_MEETING_SDK_SECRET',
  'SMTP_HOST',
  'RECAPTCHA_SECRET_KEY',
  'SENTRY_DSN',
  'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
  'NEXT_PUBLIC_ZOOM_MEETING_ID',
  'NEXT_PUBLIC_ASSET_BASE',
];

const requiredServiceGroups = [
  'Database',
  'Auth',
  'Redis',
  'Axinom',
  'Storage',
  'Zoom',
  'Support/Email/reCAPTCHA',
  'Observability',
  'Public player/config',
];

function readText(filePath: string) {
  return fs.readFileSync(filePath, 'utf8');
}

function findMatrixRow(matrix: string, variableName: string) {
  return matrix
    .split(/\r?\n/)
    .find((line) => line.startsWith('|') && line.includes(`| ${variableName} |`));
}

describe('env documentation contract', () => {
  test('documents core placeholder variables in .env.example', () => {
    const envExample = readText(envExamplePath);

    for (const variableName of requiredStarterVariables) {
      expect(envExample).toContain(variableName);
    }
  });

  test('groups the env matrix by required service areas', () => {
    const envMatrix = readText(envMatrixPath);

    for (const serviceGroup of requiredServiceGroups) {
      expect(envMatrix).toContain(serviceGroup);
    }
  });

  test('marks server secrets and public browser config explicitly', () => {
    const envMatrix = readText(envMatrixPath);

    for (const variableName of [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'ZOOM_MEETING_SDK_SECRET',
    ]) {
      expect(findMatrixRow(envMatrix, variableName)).toContain('server secret');
      expect(findMatrixRow(envMatrix, variableName)).not.toContain('public');
    }

    for (const variableName of [
      'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
      'NEXT_PUBLIC_ZOOM_MEETING_ID',
    ]) {
      expect(findMatrixRow(envMatrix, variableName)).toContain('public');
    }
  });
});
