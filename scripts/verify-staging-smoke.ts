import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const runbookPath = 'docs/vercel-staging-runbook.md';
const checklistPath = 'docs/staging-smoke-checklist.md';
const envMatrixPath = 'docs/env-matrix.md';

const requiredSmokeIds = [
  'AUTH-01',
  'AUTH-02',
  'COURSE-01',
  'PLAYBACK-01',
  'DRM-01',
  'HLS-01',
  'AXINOM-01',
  'AXINOM-02',
  'ZOOM-01',
  'SUPPORT-01',
  'REDIS-01',
  'STORAGE-01',
  'ADMIN-01',
  'LOGS-01',
  'SENTRY-01',
  'GAP-01',
];

const requiredRunbookTerms = [
  'Vercel environments',
  'Vercel environment variables',
  'function limits',
  'Google OAuth',
  'Axinom webhook',
  'Zoom Meeting SDK',
  'Azure Blob',
  'Cloudflare R2',
  'Upstash Redis',
  'Sentry',
  'maxDuration = 300',
  'npm run verify:services:strict',
  'npm run verify:staging',
  'blocked: missing credentials/service access',
];

const requiredEnvGroups = [
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

const allowedStatuses = [
  'not run',
  'pass',
  'fail',
  'blocked: missing credentials/service access',
];

function readRequiredFile(filePath: string) {
  if (!existsSync(filePath)) {
    throw new Error(`${filePath} missing`);
  }

  return readFileSync(filePath, 'utf8');
}

function assertContains(content: string, term: string, filePath: string) {
  if (!content.includes(term)) {
    throw new Error(`${filePath} missing required term: ${term}`);
  }
}

function parseChecklistRows(checklist: string) {
  return checklist
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|') && !line.includes('| ID |'))
    .filter((line) => !/^\|[-\s|]+$/.test(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
    );
}

try {
  const runbook = readRequiredFile(runbookPath);
  const checklist = readRequiredFile(checklistPath);
  const envMatrix = readRequiredFile(envMatrixPath);

  for (const term of requiredRunbookTerms) {
    assertContains(runbook, term, runbookPath);
  }

  for (const group of requiredEnvGroups) {
    assertContains(envMatrix, group, envMatrixPath);
  }

  const rows = parseChecklistRows(checklist);
  const ids = new Set(rows.map(([id]) => id));

  for (const id of requiredSmokeIds) {
    if (!ids.has(id)) {
      throw new Error(`${checklistPath} missing smoke ID: ${id}`);
    }
  }

  for (const row of rows) {
    const [id, , , status] = row;

    if (requiredSmokeIds.includes(id) && !allowedStatuses.includes(status)) {
      throw new Error(`${checklistPath} row ${id} has invalid status: ${status}`);
    }
  }

  console.log('OK staging runbook and smoke checklist cover Phase 6 requirements');
} catch (error) {
  const message = error instanceof Error ? error.message : 'staging smoke verification failed';
  console.error(`FAIL verify:staging: ${message}`);
  process.exit(1);
}
