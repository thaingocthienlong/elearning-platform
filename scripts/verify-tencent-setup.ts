#!/usr/bin/env tsx
import path from 'node:path';
import dotenv from 'dotenv';
import { validateTencentEnv } from '../src/lib/tencent/env';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function main() {
  const strict = process.argv.includes('--strict') || process.env.CI === 'true';
  const validation = validateTencentEnv(process.env, strict ? 'strict' : 'local');

  console.log('Verifying Tencent VOD configuration');
  for (const warning of validation.warnings) console.log(`WARN ${warning}`);
  for (const error of validation.errors) console.error(`ERROR ${error}`);

  if (!validation.ok) process.exit(1);

  if (!process.argv.includes('--live')) {
    console.log('SKIP live Tencent API checks. Re-run with --live after configuring Tencent credentials.');
    return;
  }

  console.log('Live Tencent checks are intentionally limited to env validation until a safe test FileId is configured.');
}

main().catch((error) => {
  console.error('Tencent setup verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
