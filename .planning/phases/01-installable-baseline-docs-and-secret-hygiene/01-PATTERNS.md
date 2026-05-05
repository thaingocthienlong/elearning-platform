# Phase 1: Installable Baseline, Docs, and Secret Hygiene - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 16 new/modified file families
**Analogs found:** 15 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | batch | `package.json` | exact |
| `package-lock.json` | config | batch | `package-lock.json` | exact |
| `.nvmrc` or `.node-version` | config | batch | none | no analog |
| `README.md` | docs | request-response | `README.md` | exact |
| `docs/setup.md` | docs | request-response | `README.md`, `docs/architecture/system_overview.md` | role-match |
| `docs/env-matrix.md` | docs/config | transform | `jest.setup.ts`, env reference scan | role-match |
| `.env.example` | config | transform | `jest.setup.ts`, `.gitignore` | role-match |
| `docs/verification.md` | docs | batch | `test-plan.md`, `package.json` | role-match |
| `docs/secret-hygiene.md` | docs/security | file-I/O | `.gitignore`, `.planning/codebase/CONCERNS.md` | role-match |
| `jest.config.ts` | config | test transform | `test-plan.md`, `tsconfig.json` | role-match |
| `jest.setup.ts` | config | test setup | `jest.setup.ts` | exact |
| `__tests__/env/env-matrix.test.ts` | test | transform | `test-plan.md` | role-match |
| `__tests__/scripts/package-scripts.test.ts` | test | file-I/O | `test-plan.md` | role-match |
| `scripts/verify-setup.ts` | utility | batch | `scripts/verify-auth-sync.ts` | role-match |
| `scripts/verify-services.ts` | utility | request-response | `scripts/verify-axinom-setup.ts`, `scripts/verify-azure-storage.ts` | role-match |
| `scripts/inventory-sensitive-files.ts` | utility/security | file-I/O | `.gitignore`, `.planning/codebase/CONCERNS.md` | partial |
| `scripts/scan-secrets.ts` | utility/security | file-I/O | `.gitignore`, `.planning/codebase/CONCERNS.md` | partial |

## Pattern Assignments

### `package.json` (config, batch)

**Analog:** `package.json`

**Script surface pattern** (lines 5-10):
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "postinstall": "prisma generate"
}
```

**Dependency placement pattern** (lines 12-87):
```json
"dependencies": {
  "@prisma/client": "^5.22.0",
  "dotenv": "^16.4.5",
  "next": "16.0.7"
},
"devDependencies": {
  "prisma": "5.22.0",
  "tsx": "^4.21.0",
  "typescript": "^5"
}
```

**Copy guidance:** Add maintainer-facing commands here, not hidden one-off commands. Keep `postinstall: prisma generate`; add direct `prisma:generate`, `db:push`, `typecheck`, `test`, `test:watch`, `verify:*`, and `secrets:*` scripts. Put `zod` in `dependencies` if env validation uses it; put Jest/Testing Library packages in `devDependencies`.

---

### `.nvmrc` or `.node-version` (config, batch)

**Analog:** No repo-local Node pin file exists.

**Use instead:** Research requires Node `>=20.9.0` for Next.js 16. The planner should choose one pinning file and keep README/docs aligned. This is a no-analog file family.

---

### `README.md` and `docs/setup.md` (docs, request-response)

**Analog:** `README.md`

**Current concise landing-page pattern** (lines 1-3, 23-30, 61-74):
```markdown
# Secure Video Platform

A secure, scalable video streaming platform with admin controls, DRM protection, and real-time session management.

## Getting Started

### Prerequisites

* Node.js 18+
* PostgreSQL (Primary DB)
* MongoDB (Logs/Analytics - *Optional/Legacy*)

## Documentation

* [System Architecture](docs/architecture/system_overview.md)
```

**Documentation structure analog:** `docs/architecture/system_overview.md` lines 7-20 and 21-37 use numbered sections, short summaries, and bullet lists:
```markdown
## 1. High-Level Architecture

The platform is a secure video streaming application built with Next.js (App Router)...

### Core Components

- **Frontend**: Next.js 16...
- **Backend**: Next.js API Routes...
```

**Copy guidance:** Keep README concise and link to detailed docs. Correct stale README claims at lines 27-29 and 49-52: Phase 1 docs must say Node `>=20.9.0`, npm with `package-lock.json`, Prisma MongoDB via `DATABASE_URL`, `prisma generate`, and `prisma db push`.

---

### `docs/env-matrix.md` and `.env.example` (docs/config, transform)

**Analog:** `jest.setup.ts`

**Placeholder-only env pattern** (lines 1-3, 5-18, 29-43, 45-55):
```typescript
// Test environment configuration with MOCK values only
// NEVER commit production secrets to this file

process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.AUTH_SECRET = 'test-auth-secret-minimum-32-characters-long';

process.env.DATABASE_URL = 'mongodb://localhost:27017/test_secure_video_platform';

process.env.ZOOM_MEETING_SDK_KEY = 'test-zoom-sdk-key';
process.env.ZOOM_MEETING_SDK_SECRET = 'test-zoom-sdk-secret';
```

**Ignore-file interaction pattern:** `.gitignore` lines 33-35 currently ignore all `.env*` files, including `.env.example`:
```gitignore
# env files (can opt-in for committing if needed)
.env*
.env.example
```

**Env source list:** Build the matrix from code references found in `src/**`, `scripts/**`, `jest.setup.ts`, Sentry configs, and Prisma. Required service groups from Phase 1 context: database, auth, Redis, Axinom, storage, Zoom, support/email/reCAPTCHA, observability, and public player/config values.

**Copy guidance:** `.env.example` must use placeholders only. The env matrix should be the source of truth with columns for service, variable, sensitivity, local required/optional, staging required/optional, source file, and notes. Because `.gitignore` ignores `.env.example`, Phase 1 must intentionally adjust the ignore rule or force-add only the placeholder example.

---

### `docs/verification.md` (docs, batch)

**Analog:** `test-plan.md` and `package.json`

**Command documentation pattern** (`test-plan.md` lines 13-19 and 21-36):
```markdown
### Required Packages

```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
```

### Jest Configuration

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
```
```

**Copy guidance:** Document root commands exactly as exposed by `package.json`. Include local default behavior and strict/CI behavior for service verification. Avoid documenting commands that bypass the pinned local dependencies with ad hoc `npx` unless the command is already a package script.

---

### `docs/secret-hygiene.md`, `scripts/inventory-sensitive-files.ts`, and `scripts/scan-secrets.ts` (security docs/utilities, file-I/O)

**Analog:** `.gitignore` and `.planning/codebase/CONCERNS.md`

**Sensitive path categories** (`.gitignore` lines 46-63):
```gitignore
# sensitive files
azure.txt
source_dump.txt
mosaic-service-account-config*.env
*.mp4
keys.json
KIDs.json
job.json
*.hex
*.der.b64
*.cpix.xml
scripts/keystore.json
wv_pssh.hex
```

**Path-only inventory source** (`.planning/codebase/CONCERNS.md` lines 83-88):
```markdown
**Secret-like files and keys are present in the repo:**
- Risk: Environment files, DRM key material, private localhost keys, and media/key artifacts exist in the workspace even though `.gitignore` marks many as sensitive. Contents were not read during this audit.
- Files: `mosaic-service-account-config.env`, `mosaic-service-account-config (1).env`, ...
- Current mitigation: `.gitignore` contains patterns for `.env*`, `mosaic-service-account-config*.env`, key JSON files, media, and DRM artifacts.
```

**Copy guidance:** Inventory scripts must inspect path/name/extension/size/git-tracked/ignored status only. Do not read or print file contents. Secret scan wrapper should invoke a redacted external scanner when available and fail in strict mode if the scanner is missing; local mode can report install guidance.

---

### `jest.config.ts` (config, test transform)

**Analog:** `test-plan.md`, `tsconfig.json`, `eslint.config.mjs`

**Existing planned Jest shape** (`test-plan.md` lines 21-36):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
};
```

**Alias/source pattern** (`tsconfig.json` lines 25-29):
```json
"paths": {
  "@/*": [
    "./src/*"
  ]
}
```

**Config module style analog** (`eslint.config.mjs` lines 1-7 and 22-24):
```typescript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
```

**Copy guidance:** Use `next/jest` in `jest.config.ts` per research, keep `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']`, map `^@/(.*)$` to `<rootDir>/src/$1`, and ignore `.next`, `node_modules`, `zoom-webapp`, and generated/vendor-heavy paths where needed.

---

### `jest.setup.ts` (config, test setup)

**Analog:** `jest.setup.ts`

**Mock env categories** (lines 5-55):
```typescript
// Auth Mocks
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

// Redis Mocks (use local Redis or mock in tests)
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:6379';

// Database (use local MongoDB for tests)
process.env.DATABASE_URL = 'mongodb://localhost:27017/test_secure_video_platform';

// Axinom Mocks
process.env.AXINOM_COM_KEY_ID = 'test-key-id';

// Zoom Mocks
process.env.ZOOM_MEETING_SDK_KEY = 'test-zoom-sdk-key';
```

**Copy guidance:** Preserve the explicit "mock values only" policy. Add `@testing-library/jest-dom` import here if component tests are added, but keep all values placeholder/test-only.

---

### `__tests__/env/env-matrix.test.ts` and `__tests__/scripts/package-scripts.test.ts` (tests, transform/file-I/O)

**Analog:** `test-plan.md`

**Jest suite/import/assert pattern** (`test-plan.md` lines 160-190):
```typescript
import { GET } from '@/app/api/session/validate/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

jest.mock('next-auth');
jest.mock('@/lib/redis');

describe('/api/session/validate', () => {
  test('returns valid:true for authenticated user', async () => {
    const req = new NextRequest('http://localhost/api/session/validate');
    const response = await GET(req);
    const data = await response.json();

    expect(data.valid).toBe(true);
  });
});
```

**Browser-global mock pattern** (`test-plan.md` lines 83-127):
```typescript
Object.defineProperty(global, 'navigator', {
  value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0' },
  writable: true,
});

expect(config?.drmType).toBe('widevine');
```

**Copy guidance:** For Phase 1, prefer low-risk docs/config tests that read `.env.example`, `docs/env-matrix.md`, `README.md`, and `package.json`. Use `describe`, `test`, `expect`; avoid async Server Component imports and deep entitlement tests.

---

### `scripts/verify-setup.ts` (utility, batch)

**Analog:** `scripts/verify-auth-sync.ts`

**Script shape with async main, deterministic test data, cleanup** (lines 1-13, 31-36, 50-70, 73):
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAuthSync() {
  console.log('Starting verification...');

  try {
    const [existingUser, whitelisted] = await Promise.all([
      prisma.user.findUnique({ where: { email: testEmail } }),
      prisma.allowedEmail.findUnique({ where: { email: testEmail } }),
    ]);

    if (updatedUser?.name === whitelistName) {
      console.log('SUCCESS: User name was updated to match whitelist.');
    } else {
      process.exit(1);
    }
  } catch (e) {
    console.error('Error during verification:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAuthSync();
```

**Copy guidance:** Use an async main function, explicit failures with `process.exit(1)`, and cleanup in `finally` when resources are opened. For setup verification, check Node/npm/package scripts/docs files without requiring external credentials.

---

### `scripts/verify-services.ts` (utility, request-response)

**Analog:** `scripts/verify-axinom-setup.ts` and `scripts/verify-azure-storage.ts`

**Dotenv loading pattern** (`scripts/verify-axinom-setup.ts` lines 1-8):
```typescript
import { getAuthToken, encodeVideoViaService } from '../src/lib/axinom-video-service';
import d from 'dotenv';
import path from 'path';

d.config({ path: path.resolve(process.cwd(), '.env') });
d.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
```

**Masked env logging pattern** (`scripts/verify-axinom-setup.ts` lines 14-23):
```typescript
Object.keys(process.env).forEach(k => {
  if (k.startsWith('AXINOM_') || k.startsWith('AX_')) {
    const val = process.env[k] || '';
    const masked = val.length > 6 ? val.substring(0, 3) + '...' + val.substring(val.length - 3) : '***';
    console.log(`   - ${k}: ${masked}`);
  }
});
```

**Required env validation pattern** (`scripts/verify-axinom-setup.ts` lines 25-67):
```typescript
const required = [
  'AXINOM_ENCODING_CLIENT_ID',
  'AXINOM_ENCODING_CLIENT_SECRET',
  'AXINOM_ENCODING_PROFILE_DRM'
];

let missing = false;
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing ENV: ${key}`);
    missing = true;
  }
});

if (missing) {
  process.exit(1);
}
```

**External request pattern** (`scripts/verify-azure-storage.ts` lines 26-31, 66-75):
```typescript
try {
  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );
} catch (error: any) {
  console.error('\nAzure Connection Failed:');
  console.error(`   ${error.message}`);
  process.exit(1);
}
```

**Copy guidance:** Phase 1 must change the default behavior: missing external credentials should skip locally and fail only with `--strict` or `CI=true`. Keep dotenv loading and masking; avoid printing raw env values. Use service groups and per-service required vars from the env matrix.

## Shared Patterns

### Root Command Surface

**Source:** `package.json` lines 5-10
**Apply to:** `package.json`, README, `docs/setup.md`, `docs/verification.md`

All maintainer actions should be root scripts. Do not bury Phase 1 verification behind undocumented direct commands.

### Prisma MongoDB Setup

**Source:** `prisma/schema.prisma` lines 1-8 and `package.json` lines 88-90
**Apply to:** setup docs, env matrix, README, setup verification
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

### Placeholder And Secret Safety

**Source:** `jest.setup.ts` lines 1-3, `.gitignore` lines 33-63, `.planning/codebase/CONCERNS.md` lines 83-88
**Apply to:** `.env.example`, env matrix, secret hygiene docs, inventory and scanner scripts

Use placeholder values only. Inventory paths/categories only. Scanner output must be redacted. Do not read, print, copy, move, or delete inherited secret/key/media artifacts in Phase 1.

### TypeScript Script Style

**Source:** `scripts/verify-auth-sync.ts`, `scripts/verify-axinom-setup.ts`, `scripts/verify-azure-storage.ts`
**Apply to:** `scripts/verify-setup.ts`, `scripts/verify-services.ts`, `scripts/inventory-sensitive-files.ts`, `scripts/scan-secrets.ts`

Use TypeScript scripts run via `tsx`, async main functions, `process.exit(1)` on failing checks, and clear console summaries. For external services, add local skip plus strict fail behavior.

### Jest Baseline

**Source:** `test-plan.md` lines 21-36 and 160-190; `jest.setup.ts` lines 1-55
**Apply to:** `jest.config.ts`, `__tests__/**`, package scripts

Use Jest globals, `setupFilesAfterEnv`, `@/*` alias mapping, and direct config/docs/script tests for Phase 1. Keep deep media/security tests deferred.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.nvmrc` or `.node-version` | config | batch | No Node version pin file exists in the repo. Use research-backed Node `>=20.9.0` and document the chosen pinning convention. |

## Metadata

**Analog search scope:** `package.json`, `README.md`, `jest.setup.ts`, `test-plan.md`, `.gitignore`, `prisma/schema.prisma`, `docs/**`, `scripts/verify-*.ts`, `.planning/codebase/*.md`, `tsconfig.json`, `eslint.config.mjs`
**Files scanned:** 30+ targeted files plus env reference scan across `src/**`, `scripts/**`, Prisma, Jest setup, Sentry, and instrumentation configs
**Pattern extraction date:** 2026-05-05
