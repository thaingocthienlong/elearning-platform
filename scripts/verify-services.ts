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
  'DoveRunner',
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

function isPlaceholderValue(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('example.invalid') ||
    normalized.includes('example.com') ||
    normalized.includes('<') ||
    normalized.includes('>') ||
    normalized.includes('placeholder') ||
    normalized.includes('your_') ||
    normalized.includes('your-') ||
    normalized.includes('changeme')
  );
}

function getEnvIssue(variableName: string): string | null {
  const value = process.env[variableName];

  if (!value) {
    return 'missing';
  }

  if (isPlaceholderValue(value)) {
    return 'placeholder value';
  }

  if (
    variableName.endsWith('_URL') ||
    variableName.endsWith('_DSN') ||
    variableName === 'DATABASE_URL'
  ) {
    try {
      const parsedUrl = new URL(value);
      if (variableName === 'DATABASE_URL') {
        if (parsedUrl.protocol !== 'mongodb:' && parsedUrl.protocol !== 'mongodb+srv:') {
          return 'invalid MongoDB URL';
        }
      } else if (parsedUrl.protocol !== 'https:' && !value.startsWith('http://localhost')) {
        return 'invalid URL protocol';
      }
    } catch {
      return 'invalid URL shape';
    }
  }

  return null;
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
  let issueAny = false;

  for (const service of requiredServiceGroups) {
    const requiredVariables = [...(grouped.get(service) ?? [])].sort();
    const variableIssues = requiredVariables
      .map((variableName) => ({ variableName, issue: getEnvIssue(variableName) }))
      .filter((entry): entry is { variableName: string; issue: string } => Boolean(entry.issue));

    if (variableIssues.length === 0) {
      console.log(`OK ${service}: required variables present`);
      continue;
    }

    issueAny = true;
    const issueList = variableIssues
      .map(({ variableName, issue }) => `${variableName} (${issue})`)
      .join(', ');

    if (strict) {
      console.error(`FAIL ${service}: ${issueList}`);
      continue;
    }

    console.log(`SKIP ${service}: ${issueList}`);
  }

  if (strict && issueAny) {
    process.exit(1);
  }
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
