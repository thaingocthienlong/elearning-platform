import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as dotenv from 'dotenv';
import { validateBunnyStreamConfig } from '../src/lib/bunny-stream/config';

for (const envPath of [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '.env.local')]) {
  if (!fs.existsSync(envPath)) continue;

  const parsed = dotenv.parse(fs.readFileSync(envPath));

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const strict = process.argv.includes('--strict') || process.env.CI === 'true';
const result = validateBunnyStreamConfig(process.env, strict ? 'strict' : 'local');

console.log('Verifying Bunny Stream configuration');

if (result.ok) {
  console.log('OK Bunny Stream env validation passed');
  console.log('OK Bunny Stream env/config validation passed; provider/dashboard checks are manual');
  process.exit(0);
}

for (const error of result.errors) {
  if (strict) {
    console.error(`FAIL Bunny Stream: ${error}`);
  } else {
    console.log(`SKIP Bunny Stream: ${error}`);
  }
}

process.exit(strict ? 1 : 0);
