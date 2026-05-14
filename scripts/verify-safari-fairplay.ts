#!/usr/bin/env tsx
import path from 'node:path';
import dotenv from 'dotenv';

import { getSafariFairPlayReadiness } from '../src/lib/safari-fairplay-readiness';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const readiness = getSafariFairPlayReadiness({
  AXINOM_FAIRPLAY_CERT_URL: process.env.AXINOM_FAIRPLAY_CERT_URL,
  NEXT_PUBLIC_AX_FP_LS_URL: process.env.NEXT_PUBLIC_AX_FP_LS_URL,
});

if (readiness.fairPlayReady) {
  console.log('Safari FairPlay readiness: ready');
  console.log(`Mode: ${readiness.mode}`);
  console.log('Checked: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL');
  process.exit(0);
}

console.log('Safari FairPlay readiness: blocked');
console.log(`Mode: ${readiness.mode}`);

if (readiness.missing.length > 0) {
  console.log(`Missing: ${readiness.missing.join(', ')}`);
}

if (readiness.invalid.length > 0) {
  console.log(`Invalid URL format: ${readiness.invalid.join(', ')}`);
}

console.log('No credential values were printed.');
process.exit(1);
