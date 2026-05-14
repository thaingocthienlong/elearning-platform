# Safari FairPlay DRM Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reproducible Safari/macOS FairPlay readiness verifier and real-device smoke checklist so maintainers can distinguish app misconfiguration, missing FairPlay credentials, Playwright WebKit limitations, and real Safari playback failures.

**Architecture:** Keep the verifier split into pure readiness logic plus a tiny CLI wrapper. The app already routes Apple browsers through FairPlay HLS or clear HLS fallback, so this plan adds guardrails and documentation around that existing behavior instead of changing playback architecture.

**Tech Stack:** Next.js 16 App Router, TypeScript, Jest, Axinom DRM, Shaka Player, macOS Safari, optional Playwright WebKit for non-authoritative browser probing.

---

## Context And Constraints

- Do not read, print, copy, or commit secret values from env files or Axinom credentials.
- Treat Playwright WebKit as useful browser automation, not as proof of real Safari FairPlay behavior. Playwright documentation says WebKit is not branded Safari and video/media behavior varies by operating system; closest Safari-like playback is WebKit on macOS.
- Shaka FairPlay docs use `com.apple.fps` for Modern EME and `com.apple.fps.1_0` only for legacy Apple Media Keys.
- Axinom FairPlay docs require HLS content, the FairPlay License Service URL, and a FairPlay Streaming certificate URL. Axinom evaluation users may use Axinom's evaluation certificate only for testing, not production.
- Existing source already has:
  - `src/lib/drm-detection.ts`
  - `src/lib/playback-routing.ts`
  - `src/hooks/player/useShakaPlayer.ts`
  - `docs/axinom-staging-checklist.md`
  - `docs/staging-smoke-checklist.md`
  - Jest tests under `__tests__/`

## File Structure

- Create `src/lib/safari-fairplay-readiness.ts`: pure functions for env/config readiness and expected Safari playback mode.
- Create `__tests__/lib/safari-fairplay-readiness.test.ts`: unit tests for readiness and playback-mode classification.
- Create `scripts/verify-safari-fairplay.ts`: CLI wrapper that reports sanitized readiness without printing secret values.
- Create `__tests__/scripts/verify-safari-fairplay.test.ts`: CLI tests using child process env overrides.
- Modify `package.json`: add `verify:safari-fairplay`.
- Modify `docs/axinom-staging-checklist.md`: add a macOS Safari FairPlay smoke section with exact evidence to collect.
- Modify `docs/staging-smoke-checklist.md`: add Safari-specific smoke rows.
- Modify `__tests__/docs/staging-docs.test.ts`: assert the Safari smoke docs stay present.

## Official References

- Playwright browser/media behavior: https://playwright.dev/docs/browsers
- Shaka FairPlay support: https://shaka-player-demo.appspot.com/docs/api/tutorial-fairplay.html
- Axinom Shaka integration: https://docs.axinom.com/services/drm/players/shaka
- Axinom FairPlay requirements: https://docs.axinom.com/services/drm/license-service/fairplay/
- Axinom FairPlay evaluation certificate: https://docs.axinom.com/services/drm/license-service/fairplay/fairplay-evaluation-certificate

---

### Task 1: Pure Safari FairPlay Readiness Logic

**Files:**
- Create: `src/lib/safari-fairplay-readiness.ts`
- Test: `__tests__/lib/safari-fairplay-readiness.test.ts`

- [ ] **Step 1: Write the failing readiness tests**

Create `__tests__/lib/safari-fairplay-readiness.test.ts`:

```ts
import {
  getSafariFairPlayReadiness,
  getSafariPlaybackExpectation,
} from '@/lib/safari-fairplay-readiness';

const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

describe('Safari FairPlay readiness', () => {
  test('reports FairPlay ready when certificate and FairPlay license URL are configured', () => {
    expect(
      getSafariFairPlayReadiness({
        AXINOM_FAIRPLAY_CERT_URL: 'https://tools.axinom.com/FPScert/fairplay.cer',
        NEXT_PUBLIC_AX_FP_LS_URL: 'https://drm-fairplay-licensing.axprod.net/AcquireLicense',
      })
    ).toEqual({
      fairPlayReady: true,
      mode: 'fairplay-drm',
      missing: [],
      invalid: [],
    });
  });

  test('reports missing FairPlay variables without leaking values', () => {
    expect(getSafariFairPlayReadiness({})).toEqual({
      fairPlayReady: false,
      mode: 'clear-hls-or-blocked',
      missing: ['AXINOM_FAIRPLAY_CERT_URL', 'NEXT_PUBLIC_AX_FP_LS_URL'],
      invalid: [],
    });
  });

  test('reports invalid URL names without including configured values', () => {
    expect(
      getSafariFairPlayReadiness({
        AXINOM_FAIRPLAY_CERT_URL: 'not-a-url',
        NEXT_PUBLIC_AX_FP_LS_URL: 'ftp://licenses.example/fairplay',
      })
    ).toEqual({
      fairPlayReady: false,
      mode: 'clear-hls-or-blocked',
      missing: [],
      invalid: ['AXINOM_FAIRPLAY_CERT_URL', 'NEXT_PUBLIC_AX_FP_LS_URL'],
    });
  });

  test('expects FairPlay DRM for macOS Safari when FairPlay is ready and protected HLS exists', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: null,
        fairPlayReady: true,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'fairplay-drm',
      reason: 'Safari has protected HLS and FairPlay env is configured.',
    });
  });

  test('expects clear HLS fallback for macOS Safari when FairPlay is not ready and clear HLS exists', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: 'https://media.example/clear/master.m3u8',
        fairPlayReady: false,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'clear-hls-fallback',
      reason: 'Safari should use clear HLS fallback because FairPlay env is not configured.',
    });
  });

  test('expects blocked playback for macOS Safari when neither FairPlay nor clear HLS is available', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: SAFARI_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: null,
        fairPlayReady: false,
      })
    ).toEqual({
      appleBrowser: true,
      expectedMode: 'blocked',
      reason: 'Safari has no clear HLS fallback and FairPlay env is not configured.',
    });
  });

  test('does not classify macOS Chrome as an Apple HLS browser', () => {
    expect(
      getSafariPlaybackExpectation({
        userAgent: CHROME_MAC,
        hlsUrl: 'https://media.example/protected/master.m3u8',
        hlsUrlClear: 'https://media.example/clear/master.m3u8',
        fairPlayReady: false,
      })
    ).toEqual({
      appleBrowser: false,
      expectedMode: 'not-apple-browser',
      reason: 'This check is only for Safari/iOS Apple HLS playback.',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- __tests__/lib/safari-fairplay-readiness.test.ts --runInBand
```

Expected: FAIL because `@/lib/safari-fairplay-readiness` does not exist.

- [ ] **Step 3: Implement the pure readiness logic**

Create `src/lib/safari-fairplay-readiness.ts`:

```ts
import { isAppleHlsBrowser } from '@/lib/playback-routing';

const REQUIRED_FAIRPLAY_ENV = [
  'AXINOM_FAIRPLAY_CERT_URL',
  'NEXT_PUBLIC_AX_FP_LS_URL',
] as const;

export type SafariFairPlayEnvName = (typeof REQUIRED_FAIRPLAY_ENV)[number];

export interface SafariFairPlayEnv {
  AXINOM_FAIRPLAY_CERT_URL?: string;
  NEXT_PUBLIC_AX_FP_LS_URL?: string;
}

export interface SafariFairPlayReadiness {
  fairPlayReady: boolean;
  mode: 'fairplay-drm' | 'clear-hls-or-blocked';
  missing: SafariFairPlayEnvName[];
  invalid: SafariFairPlayEnvName[];
}

export interface SafariPlaybackExpectationInput {
  userAgent: string;
  hlsUrl: string | null;
  hlsUrlClear: string | null;
  fairPlayReady: boolean;
}

export interface SafariPlaybackExpectation {
  appleBrowser: boolean;
  expectedMode:
    | 'fairplay-drm'
    | 'clear-hls-fallback'
    | 'blocked'
    | 'not-apple-browser';
  reason: string;
}

function hasHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getSafariFairPlayReadiness(
  env: SafariFairPlayEnv
): SafariFairPlayReadiness {
  const missing = REQUIRED_FAIRPLAY_ENV.filter((name) => !env[name]);
  const invalid = REQUIRED_FAIRPLAY_ENV.filter((name) => {
    const value = env[name];
    return Boolean(value) && !hasHttpUrl(value);
  });
  const fairPlayReady = missing.length === 0 && invalid.length === 0;

  return {
    fairPlayReady,
    mode: fairPlayReady ? 'fairplay-drm' : 'clear-hls-or-blocked',
    missing: [...missing],
    invalid: [...invalid],
  };
}

export function getSafariPlaybackExpectation({
  userAgent,
  hlsUrl,
  hlsUrlClear,
  fairPlayReady,
}: SafariPlaybackExpectationInput): SafariPlaybackExpectation {
  if (!isAppleHlsBrowser(userAgent)) {
    return {
      appleBrowser: false,
      expectedMode: 'not-apple-browser',
      reason: 'This check is only for Safari/iOS Apple HLS playback.',
    };
  }

  if (fairPlayReady && hlsUrl) {
    return {
      appleBrowser: true,
      expectedMode: 'fairplay-drm',
      reason: 'Safari has protected HLS and FairPlay env is configured.',
    };
  }

  if (!fairPlayReady && hlsUrlClear) {
    return {
      appleBrowser: true,
      expectedMode: 'clear-hls-fallback',
      reason: 'Safari should use clear HLS fallback because FairPlay env is not configured.',
    };
  }

  return {
    appleBrowser: true,
    expectedMode: 'blocked',
    reason: 'Safari has no clear HLS fallback and FairPlay env is not configured.',
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test -- __tests__/lib/safari-fairplay-readiness.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/safari-fairplay-readiness.ts __tests__/lib/safari-fairplay-readiness.test.ts
git commit -m "test: add safari fairplay readiness logic"
```

---

### Task 2: Sanitized CLI Verifier

**Files:**
- Create: `scripts/verify-safari-fairplay.ts`
- Create: `__tests__/scripts/verify-safari-fairplay.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing CLI tests**

Create `__tests__/scripts/verify-safari-fairplay.test.ts`:

```ts
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const SCRIPT = path.join(process.cwd(), 'scripts/verify-safari-fairplay.ts');

function runVerifier(env: NodeJS.ProcessEnv) {
  return spawnSync('npx', ['tsx', SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AXINOM_FAIRPLAY_CERT_URL: '',
      NEXT_PUBLIC_AX_FP_LS_URL: '',
      ...env,
    },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

describe('verify-safari-fairplay CLI', () => {
  test('exits 1 and prints missing variable names when FairPlay env is absent', () => {
    const result = runVerifier({});

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Safari FairPlay readiness: blocked');
    expect(result.stdout).toContain('Missing: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL');
    expect(result.stdout).not.toContain('secret');
  });

  test('exits 1 and prints invalid variable names without printing invalid values', () => {
    const result = runVerifier({
      AXINOM_FAIRPLAY_CERT_URL: 'not-a-url',
      NEXT_PUBLIC_AX_FP_LS_URL: 'ftp://licenses.example/fairplay',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Invalid URL format: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL');
    expect(result.stdout).not.toContain('not-a-url');
    expect(result.stdout).not.toContain('ftp://licenses.example/fairplay');
  });

  test('exits 0 when FairPlay certificate and license URLs are configured', () => {
    const result = runVerifier({
      AXINOM_FAIRPLAY_CERT_URL: 'https://tools.axinom.com/FPScert/fairplay.cer',
      NEXT_PUBLIC_AX_FP_LS_URL: 'https://drm-fairplay-licensing.axprod.net/AcquireLicense',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Safari FairPlay readiness: ready');
    expect(result.stdout).toContain('Mode: fairplay-drm');
    expect(result.stdout).not.toContain('https://tools.axinom.com');
    expect(result.stdout).not.toContain('https://drm-fairplay-licensing.axprod.net');
  });
});
```

- [ ] **Step 2: Run the CLI test to verify it fails**

Run:

```bash
npm test -- __tests__/scripts/verify-safari-fairplay.test.ts --runInBand
```

Expected: FAIL because `scripts/verify-safari-fairplay.ts` does not exist.

- [ ] **Step 3: Add the CLI script**

Create `scripts/verify-safari-fairplay.ts`:

```ts
#!/usr/bin/env tsx
import { getSafariFairPlayReadiness } from '../src/lib/safari-fairplay-readiness';

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

console.log('No secret or credential values were printed.');
process.exit(1);
```

- [ ] **Step 4: Add the package script**

Modify `package.json` scripts to include `verify:safari-fairplay`.

Expected scripts block excerpt:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "prisma:generate": "prisma generate",
    "db:push": "prisma db push",
    "verify:setup": "tsx scripts/verify-setup.ts",
    "verify:services": "tsx scripts/verify-services.ts",
    "verify:services:strict": "tsx scripts/verify-services.ts --strict",
    "verify:redis": "tsx scripts/verify-redis.ts",
    "verify:email": "tsx scripts/verify-email.ts",
    "verify:axinom": "tsx scripts/verify-axinom-setup.ts",
    "verify:safari-fairplay": "tsx scripts/verify-safari-fairplay.ts",
    "verify:staging": "tsx scripts/verify-staging-smoke.ts",
    "secrets:inventory": "tsx scripts/inventory-sensitive-files.ts",
    "secrets:scan": "tsx scripts/scan-secrets.ts",
    "postinstall": "prisma generate"
  }
}
```

- [ ] **Step 5: Run the CLI tests to verify they pass**

Run:

```bash
npm test -- __tests__/scripts/verify-safari-fairplay.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Run the verifier manually in blocked mode**

Run:

```bash
npm run verify:safari-fairplay
```

Expected when local env lacks FairPlay:

```text
Safari FairPlay readiness: blocked
Mode: clear-hls-or-blocked
Missing: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL
No secret or credential values were printed.
```

Expected when local env has both URLs configured:

```text
Safari FairPlay readiness: ready
Mode: fairplay-drm
Checked: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL
```

- [ ] **Step 7: Commit Task 2**

```bash
git add scripts/verify-safari-fairplay.ts __tests__/scripts/verify-safari-fairplay.test.ts package.json
git commit -m "feat: add safari fairplay verifier"
```

---

### Task 3: Staging Documentation And Smoke Rows

**Files:**
- Modify: `docs/axinom-staging-checklist.md`
- Modify: `docs/staging-smoke-checklist.md`
- Modify: `__tests__/docs/staging-docs.test.ts`

- [ ] **Step 1: Write the failing documentation tests**

Append this `describe` block to `__tests__/docs/staging-docs.test.ts` after the existing `staging deployment documentation contract` block. The file already defines `readText`, so do not add new imports.

```ts
describe('Safari FairPlay staging docs', () => {
  test('Axinom staging checklist documents real macOS Safari FairPlay verification', () => {
    const checklist = readText('docs/axinom-staging-checklist.md');

    expect(checklist).toContain('## 6B. macOS Safari FairPlay Smoke');
    expect(checklist).toContain('npm run verify:safari-fairplay');
    expect(checklist).toContain('Use real macOS Safari for acceptance');
    expect(checklist).toContain('Playwright WebKit is not a FairPlay acceptance substitute');
    expect(checklist).toContain('Do not paste license tokens, certificate contents, Communication Key values, or DRM content keys');
  });

  test('staging smoke checklist has Safari-specific FairPlay and fallback rows', () => {
    const checklist = readText('docs/staging-smoke-checklist.md');

    expect(checklist).toContain('SAFARI-DRM-01');
    expect(checklist).toContain('SAFARI-FALLBACK-01');
    expect(checklist).toContain('real macOS Safari');
    expect(checklist).toContain('clear HLS fallback');
  });
});
```

- [ ] **Step 2: Run the documentation tests to verify they fail**

Run:

```bash
npm test -- __tests__/docs/staging-docs.test.ts --runInBand
```

Expected: FAIL because the Safari-specific text and smoke rows are missing.

- [ ] **Step 3: Add macOS Safari smoke instructions to the Axinom checklist**

Insert this section after `## 6A. Local App Playback Smoke` in `docs/axinom-staging-checklist.md`:

````md
## 6B. macOS Safari FairPlay Smoke

Use real macOS Safari for acceptance. Playwright WebKit is useful for browser automation checks, but Playwright WebKit is not a FairPlay acceptance substitute because it is not branded Safari and media behavior varies by operating system.

Before opening the watch page, run:

```bash
npm run verify:safari-fairplay
```

Expected FairPlay-ready result:

```text
Safari FairPlay readiness: ready
Mode: fairplay-drm
Checked: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL
```

If the verifier reports `blocked`, Safari acceptance must use `hlsUrlClear` from the clear processing profile instead of claiming FairPlay DRM playback.

Real-device FairPlay smoke steps:

1. Use a Mac with current Safari and no custom browser automation patches.
2. Sign in as an entitled staging learner.
3. Open `/watch/<videoId>` for a video row with `hlsUrl`, `drmKeyId`, and no `hlsUrlClear` fallback selected.
4. Accept the IPR consent prompt.
5. In Safari Web Inspector, confirm the HLS manifest request loads.
6. Confirm the FairPlay license request goes to the Axinom FairPlay License Service URL.
7. Confirm the license request includes `X-AxDRM-Message`.
8. Confirm manifest and media segment requests do not include `X-AxDRM-Message`.
9. Press play and confirm the video element `currentTime` advances for at least 10 seconds.
10. Record evidence as sanitized status, browser version, video row ID, public Axinom operational status fields, and HTTP status codes only.

Do not paste license tokens, certificate contents, Communication Key values, or DRM content keys into docs, screenshots, tickets, or chat.
````

- [ ] **Step 4: Add Safari rows to the staging smoke checklist**

Insert these rows after `DRM-01` in `docs/staging-smoke-checklist.md`:

```md
| SAFARI-DRM-01 | Safari DRM | On real macOS Safari with FairPlay env configured, an authorized learner can open `/watch/<videoId>`, load protected HLS, request the Axinom FairPlay license, and play for at least 10 seconds. | not run | |
| SAFARI-FALLBACK-01 | Safari fallback | When FairPlay env is not configured, Safari acceptance uses `hlsUrlClear` clear HLS fallback or is marked blocked; it is not recorded as FairPlay DRM success. | not run | |
```

- [ ] **Step 5: Run documentation tests to verify they pass**

Run:

```bash
npm test -- __tests__/docs/staging-docs.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add docs/axinom-staging-checklist.md docs/staging-smoke-checklist.md __tests__/docs/staging-docs.test.ts
git commit -m "docs: add safari fairplay smoke checklist"
```

---

### Task 4: Final Verification

**Files:**
- Verify only; no source files should be modified in this task.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- __tests__/lib/safari-fairplay-readiness.test.ts __tests__/scripts/verify-safari-fairplay.test.ts __tests__/docs/staging-docs.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test -- --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: command exits 0. Existing repository warnings may remain, but no new lint errors should be introduced.

- [ ] **Step 5: Run sanitized verifier**

Run:

```bash
npm run verify:safari-fairplay
```

Expected without local FairPlay env:

```text
Safari FairPlay readiness: blocked
Mode: clear-hls-or-blocked
Missing: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL
No secret or credential values were printed.
```

Expected with local FairPlay env:

```text
Safari FairPlay readiness: ready
Mode: fairplay-drm
Checked: AXINOM_FAIRPLAY_CERT_URL, NEXT_PUBLIC_AX_FP_LS_URL
```

- [ ] **Step 6: Commit final verification note if docs or package lock changed**

If only files from Tasks 1-3 changed and all commits are already present, do not create an empty commit. If package metadata changed beyond `package.json`, commit it:

```bash
git add package-lock.json
git commit -m "chore: update safari fairplay verifier lockfile"
```

Expected: commit only exists if `package-lock.json` changed.

---

## Self-Review

- Spec coverage: The plan covers Safari/macOS DRM readiness, the difference between Playwright WebKit and real Safari, Axinom/Shaka FairPlay config requirements, sanitized verification, and staging evidence.
- Placeholder scan: No implementation step relies on undefined future work or missing code snippets.
- Type consistency: `SafariFairPlayReadiness`, `SafariPlaybackExpectation`, `getSafariFairPlayReadiness`, and `getSafariPlaybackExpectation` are defined before use and referenced consistently.
