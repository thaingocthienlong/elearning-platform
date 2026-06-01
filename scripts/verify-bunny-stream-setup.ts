import path from 'node:path';
import process from 'node:process';
import * as dotenv from 'dotenv';
import { validateBunnyStreamConfig } from '../src/lib/bunny-stream/config';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const strict = process.argv.includes('--strict') || process.env.CI === 'true';
const result = validateBunnyStreamConfig(process.env, strict ? 'strict' : 'local');

console.log('Verifying Bunny Stream configuration');

if (result.ok) {
  console.log('OK Bunny Stream env validation passed');
  console.log('OK Provider: Bunny Stream + MediaCage DRM + signed embed playback');
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
