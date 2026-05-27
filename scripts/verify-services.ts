import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

const envMatrixPath = 'docs/env-matrix.md';
const strict = process.argv.includes('--strict') || process.env.CI === 'true';

const requiredServiceGroups = [
  'Database',
  'Auth',
  'Redis',
  'Axinom',
  'VdoCipher',
  'Storage',
  'Zoom',
  'Support/Email/reCAPTCHA',
  'Observability',
  'Public player/config',
];

type MatrixRow = {
  service: string;
  variable: string;
  local: string;
  staging: string;
};

function loadEnvFiles() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function readRequiredRows() {
  if (!existsSync(envMatrixPath)) {
    throw new Error(`${envMatrixPath} missing`);
  }

  const matrix = readFileSync(envMatrixPath, 'utf8');
  const rows: MatrixRow[] = [];

  for (const line of matrix.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    if (line.includes('| Service | Variable |')) continue;
    if (/^\|[-\s|]+$/.test(line)) continue;

    const [service, variable, , local, staging] = parseTableRow(line);

    if (!service || !variable) continue;
    if (local !== 'required' && staging !== 'required') continue;

    rows.push({ service, variable, local, staging });
  }

  return rows;
}

function readMatrixServiceGroups() {
  if (!existsSync(envMatrixPath)) {
    throw new Error(`${envMatrixPath} missing`);
  }

  const matrix = readFileSync(envMatrixPath, 'utf8');
  const services = new Set<string>();

  for (const line of matrix.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    if (line.includes('| Service | Variable |')) continue;
    if (/^\|[-\s|]+$/.test(line)) continue;

    const [service] = parseTableRow(line);

    if (service) {
      services.add(service);
    }
  }

  return services;
}

function groupRequiredVariables(rows: MatrixRow[]) {
  const grouped = new Map<string, Set<string>>();

  for (const row of rows) {
    const variables = grouped.get(row.service) ?? new Set<string>();
    variables.add(row.variable);
    grouped.set(row.service, variables);
  }

  return grouped;
}

function verifyRequiredGroups(matrixServices: Set<string>) {
  const missingGroups = requiredServiceGroups.filter(
    (service) => !matrixServices.has(service)
  );

  if (missingGroups.length > 0) {
    throw new Error(
      `${envMatrixPath} missing required service groups: ${missingGroups.join(', ')}`
    );
  }
}

function verifyServices(grouped: Map<string, Set<string>>) {
  let missingAny = false;

  for (const service of requiredServiceGroups) {
    if (service === 'VdoCipher') {
      const missingVdoCipher = verifyVdoCipher();
      missingAny = missingAny || missingVdoCipher;
      continue;
    }

    const requiredVariables = [...(grouped.get(service) ?? [])].sort();
    const missingVariables = requiredVariables.filter(
      (variableName) => !process.env[variableName]
    );

    if (missingVariables.length === 0) {
      console.log(`OK ${service}: required variables present`);
      continue;
    }

    missingAny = true;
    const missingList = missingVariables.join(', ');

    if (strict) {
      console.error(`FAIL ${service}: missing ${missingList}`);
      continue;
    }

    console.log(`SKIP ${service}: missing ${missingList}`);
  }

  if (strict && missingAny) {
    process.exit(1);
  }
}

function getVdoCipherAccountSuffix(accountId: string) {
  return accountId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function verifyVdoCipher() {
  const configuredAccountIds = (process.env.VDOCIPHER_ACCOUNT_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const accountIds = configuredAccountIds.length > 0 ? configuredAccountIds : ['primary'];
  const defaultAccountId = process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID?.trim() || accountIds[0];
  const missingVariables: string[] = [];

  if (!accountIds.includes(defaultAccountId)) {
    missingVariables.push('VDOCIPHER_DEFAULT_ACCOUNT_ID');
  }

  for (const accountId of accountIds) {
    const suffix = getVdoCipherAccountSuffix(accountId);

    if (!suffix || !process.env[`VDOCIPHER_API_SECRET_${suffix}`]?.trim()) {
      missingVariables.push(`VDOCIPHER_API_SECRET_${suffix || '<ACCOUNT>'}`);
    }
  }

  if (missingVariables.length === 0) {
    console.log(`OK VdoCipher: required variables present for ${accountIds.length} account(s)`);
    return false;
  }

  const missingList = [...new Set(missingVariables)].join(', ');

  if (strict) {
    console.error(`FAIL VdoCipher: missing ${missingList}`);
  } else {
    console.log(`SKIP VdoCipher: missing ${missingList}`);
  }

  return true;
}

try {
  loadEnvFiles();
  const requiredRows = readRequiredRows();
  const grouped = groupRequiredVariables(requiredRows);

  verifyRequiredGroups(readMatrixServiceGroups());
  verifyServices(grouped);
} catch (error) {
  const message = error instanceof Error ? error.message : 'service verification failed';
  console.error(`FAIL verify:services: ${message}`);
  process.exit(1);
}
