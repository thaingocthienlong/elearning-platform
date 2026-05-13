# No-FairPlay Apple Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make clear HLS the explicit, tested Apple-browser fallback when real FairPlay is not configured.

**Architecture:** Keep the existing playback architecture: Axinom DRM remains active for DASH Widevine/PlayReady, while iOS and macOS Safari use `hlsUrlClear` when available. Add a small shared playback-source selector so the Apple fallback decision is tested outside React, then use it from `WatchPageClient`. Redact FairPlay certificate route logging so certificate URLs are never printed.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Jest, Shaka Player, Axinom DRM, Prisma/MongoDB.

---

## File Structure

- Modify: `src/components/course/WatchPageClient.tsx`
  - Responsibility: Compose the watch page UI and pass the selected playback sources into `DRMPlayerWrapper`.
- Create: `src/lib/playback-routing.ts`
  - Responsibility: Pure browser/user-agent playback-source selection for Apple clear HLS fallback.
- Create: `__tests__/lib/playback-routing.test.ts`
  - Responsibility: Unit tests for Apple-browser source selection and DRM-token suppression.
- Modify: `__tests__/lib/drm-detection.test.ts`
  - Responsibility: Add missing Safari clear-HLS routing coverage at the DRM-config layer.
- Create: `__tests__/api/fairplay-cert.test.ts`
  - Responsibility: Verify FairPlay certificate route behavior and redacted logging.
- Modify: `src/app/api/drm/fairplay-cert/route.ts`
  - Responsibility: Proxy a configured FairPlay certificate URL only when real FairPlay is configured, without logging the URL or certificate contents.

---

### Task 1: Add Pure Watch Playback Routing

**Files:**
- Create: `src/lib/playback-routing.ts`
- Create: `__tests__/lib/playback-routing.test.ts`
- Modify: `src/components/course/WatchPageClient.tsx`

- [ ] **Step 1: Write the failing playback routing tests**

Create `__tests__/lib/playback-routing.test.ts`:

```typescript
import { isAppleHlsBrowser, selectWatchPlaybackSources } from '@/lib/playback-routing';

describe('watch playback source routing', () => {
  const dashUrl = 'https://media.example/video/manifest.mpd';
  const hlsUrl = 'https://media.example/video/protected.m3u8';
  const hlsUrlClear = 'https://media.example/video/clear.m3u8';
  const drmToken = 'signed-axinom-token';

  test('detects all iOS browsers as Apple HLS browsers', () => {
    expect(
      isAppleHlsBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.0.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(true);
  });

  test('detects macOS Safari as an Apple HLS browser', () => {
    expect(
      isAppleHlsBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      )
    ).toBe(true);
  });

  test('does not treat macOS Chrome as an Apple HLS browser', () => {
    expect(
      isAppleHlsBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  test('routes iOS to clear HLS and suppresses the DRM token when clear fallback exists', () => {
    expect(
      selectWatchPlaybackSources({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        dashUrl,
        hlsUrl,
        hlsUrlClear,
        drmToken,
      })
    ).toEqual({
      dashUrl: null,
      hlsUrl: hlsUrlClear,
      drmToken: '',
      isAppleHlsBrowser: true,
      isClearHlsFallback: true,
    });
  });

  test('routes macOS Safari to clear HLS and suppresses the DRM token when clear fallback exists', () => {
    expect(
      selectWatchPlaybackSources({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        dashUrl,
        hlsUrl,
        hlsUrlClear,
        drmToken,
      })
    ).toEqual({
      dashUrl: null,
      hlsUrl: hlsUrlClear,
      drmToken: '',
      isAppleHlsBrowser: true,
      isClearHlsFallback: true,
    });
  });

  test('keeps protected HLS and DRM token for Apple browsers when no clear fallback exists', () => {
    expect(
      selectWatchPlaybackSources({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        dashUrl,
        hlsUrl,
        hlsUrlClear: null,
        drmToken,
      })
    ).toEqual({
      dashUrl: null,
      hlsUrl,
      drmToken,
      isAppleHlsBrowser: true,
      isClearHlsFallback: false,
    });
  });

  test('keeps DASH and DRM token for non-Apple browsers', () => {
    expect(
      selectWatchPlaybackSources({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        dashUrl,
        hlsUrl,
        hlsUrlClear,
        drmToken,
      })
    ).toEqual({
      dashUrl,
      hlsUrl,
      drmToken,
      isAppleHlsBrowser: false,
      isClearHlsFallback: false,
    });
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
npm run test -- __tests__/lib/playback-routing.test.ts --runInBand
```

Expected: FAIL because `@/lib/playback-routing` does not exist.

- [ ] **Step 3: Implement the pure routing helper**

Create `src/lib/playback-routing.ts`:

```typescript
export interface WatchPlaybackSourceInput {
  userAgent: string;
  dashUrl: string | null;
  hlsUrl: string | null;
  hlsUrlClear: string | null;
  drmToken: string;
}

export interface WatchPlaybackSources {
  dashUrl: string | null;
  hlsUrl: string | null;
  drmToken: string;
  isAppleHlsBrowser: boolean;
  isClearHlsFallback: boolean;
}

export function isAppleHlsBrowser(userAgent: string): boolean {
  const isIOS = /iPhone|iPad|iPod/.test(userAgent);
  const isMac = /Mac OS/.test(userAgent) && !isIOS;
  const isSafari = /Safari/.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Edg/.test(userAgent);

  return isIOS || (isMac && isSafari);
}

export function selectWatchPlaybackSources({
  userAgent,
  dashUrl,
  hlsUrl,
  hlsUrlClear,
  drmToken,
}: WatchPlaybackSourceInput): WatchPlaybackSources {
  const appleHlsBrowser = isAppleHlsBrowser(userAgent);
  const clearAppleFallback = appleHlsBrowser && Boolean(hlsUrlClear);

  if (clearAppleFallback) {
    return {
      dashUrl: null,
      hlsUrl: hlsUrlClear,
      drmToken: '',
      isAppleHlsBrowser: true,
      isClearHlsFallback: true,
    };
  }

  if (appleHlsBrowser) {
    return {
      dashUrl: null,
      hlsUrl,
      drmToken,
      isAppleHlsBrowser: true,
      isClearHlsFallback: false,
    };
  }

  return {
    dashUrl,
    hlsUrl,
    drmToken,
    isAppleHlsBrowser: false,
    isClearHlsFallback: false,
  };
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```bash
npm run test -- __tests__/lib/playback-routing.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Wire `WatchPageClient` to the helper**

In `src/components/course/WatchPageClient.tsx`, add the import:

```typescript
import { selectWatchPlaybackSources } from '@/lib/playback-routing';
```

Replace the existing `isIOSorSafari` state block:

```typescript
const [isIOSorSafari] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isMac = /Mac OS/.test(ua) && !/iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);

    return isIOS || (isMac && isSafari);
});
```

with:

```typescript
const [playbackSources] = useState(() =>
    selectWatchPlaybackSources({
        userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
        dashUrl,
        hlsUrl,
        hlsUrlClear,
        drmToken,
    })
);
```

Replace the `DRMPlayerWrapper` props:

```tsx
dashUrl={isIOSorSafari ? null : dashUrl}
hlsUrl={isIOSorSafari && hlsUrlClear ? hlsUrlClear : hlsUrl}
drmToken={isIOSorSafari && hlsUrlClear ? '' : drmToken}
```

with:

```tsx
dashUrl={playbackSources.dashUrl}
hlsUrl={playbackSources.hlsUrl}
drmToken={playbackSources.drmToken}
```

Replace:

```tsx
isClearHlsFallback={isIOSorSafari && Boolean(hlsUrlClear)}
```

with:

```tsx
isClearHlsFallback={playbackSources.isClearHlsFallback}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm run test -- __tests__/lib/playback-routing.test.ts --runInBand
```

Expected: PASS.

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/playback-routing.ts __tests__/lib/playback-routing.test.ts src/components/course/WatchPageClient.tsx
git commit -m "fix: isolate apple playback fallback"
```

---

### Task 2: Complete DRM Config Routing Coverage

**Files:**
- Modify: `__tests__/lib/drm-detection.test.ts`
- Modify only if tests fail: `src/lib/drm-detection.ts`

- [ ] **Step 1: Add missing macOS Safari clear-HLS and iOS unsupported tests**

In `__tests__/lib/drm-detection.test.ts`, inside `describe('DRM playback routing')`, add these tests after the existing iOS clear-HLS test:

```typescript
test('routes macOS Safari to clear HLS when a clear fallback is selected', () => {
  setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  );

  expect(getOptimalDRMConfig(null, hlsUrl, false, true)).toEqual({
    drmType: 'fairplay',
    manifestUrl: hlsUrl,
    protocol: 'HLS',
    requiresL1: false,
    isClearPlayback: true,
  });
});

test('does not route iOS to FairPlay when no certificate or clear fallback is configured', () => {
  setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  );

  expect(getOptimalDRMConfig(null, hlsUrl, false, false, false)).toBeNull();
});
```

- [ ] **Step 2: Run the DRM detection tests**

Run:

```bash
npm run test -- __tests__/lib/drm-detection.test.ts --runInBand
```

Expected: PASS if current routing already matches the design. If either test fails, continue to Step 3.

- [ ] **Step 3: Fix `getOptimalDRMConfig` only if Step 2 fails**

In `src/lib/drm-detection.ts`, ensure the iOS and Safari branches both use this order:

```typescript
if (isClearHlsFallback) {
  console.warn('Using clear HLS fallback on Apple browser');
  return {
    drmType: 'fairplay',
    manifestUrl: hlsUrl,
    protocol: 'HLS',
    requiresL1: false,
    isClearPlayback: true,
  };
}

if (!isFairPlayConfigured) {
  console.warn('FairPlay is not configured and no clear HLS fallback is available for Apple browser');
  return null;
}

return {
  drmType: 'fairplay',
  manifestUrl: hlsUrl,
  protocol: 'HLS',
  requiresL1: true,
};
```

Keep the existing platform-specific `hlsUrl` null checks before this block.

- [ ] **Step 4: Run the DRM detection tests again**

Run:

```bash
npm run test -- __tests__/lib/drm-detection.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add __tests__/lib/drm-detection.test.ts src/lib/drm-detection.ts
git commit -m "test: cover no-fairplay drm routing"
```

If `src/lib/drm-detection.ts` was not changed, omit it from `git add`.

---

### Task 3: Redact FairPlay Certificate Route Logs

**Files:**
- Create: `__tests__/api/fairplay-cert.test.ts`
- Modify: `src/app/api/drm/fairplay-cert/route.ts`

- [ ] **Step 1: Write failing route tests**

Create `__tests__/api/fairplay-cert.test.ts`:

```typescript
describe('/api/drm/fairplay-cert', () => {
  const originalCertUrl = process.env.AXINOM_FAIRPLAY_CERT_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    process.env.AXINOM_FAIRPLAY_CERT_URL = 'https://tenant.example/private-fairplay.cer';
  });

  afterEach(() => {
    if (originalCertUrl === undefined) {
      delete process.env.AXINOM_FAIRPLAY_CERT_URL;
    } else {
      process.env.AXINOM_FAIRPLAY_CERT_URL = originalCertUrl;
    }
    global.fetch = originalFetch;
  });

  test('returns 500 when FairPlay certificate URL is not configured', async () => {
    delete process.env.AXINOM_FAIRPLAY_CERT_URL;
    const { GET } = await import('@/app/api/drm/fairplay-cert/route');

    const response = await (GET as () => Promise<Response>)();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'FairPlay certificate not configured' });
  });

  test('does not log certificate URL when upstream fetch fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
    }) as jest.Mock;

    const { GET } = await import('@/app/api/drm/fairplay-cert/route');

    const response = await (GET as () => Promise<Response>)();

    expect(response.status).toBe(502);
    expect(consoleLog).not.toHaveBeenCalledWith(expect.stringContaining('tenant.example'));
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('tenant.example'));
  });

  test('returns the certificate bytes with cache headers', async () => {
    const certificate = new Uint8Array([1, 2, 3]).buffer;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(certificate),
    }) as jest.Mock;

    const { GET } = await import('@/app/api/drm/fairplay-cert/route');

    const response = await (GET as () => Promise<Response>)();
    const body = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(Array.from(new Uint8Array(body))).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run:

```bash
npm run test -- __tests__/api/fairplay-cert.test.ts --runInBand
```

Expected: FAIL because the current route logs the certificate URL.

- [ ] **Step 3: Redact route logs and remove unused request parameter**

Replace `src/app/api/drm/fairplay-cert/route.ts` with:

```typescript
import { NextResponse } from 'next/server';

/**
 * FairPlay Certificate Endpoint
 * Fetches a configured FairPlay certificate without exposing its URL or bytes in logs.
 */
export async function GET() {
    try {
        const certUrl = process.env.AXINOM_FAIRPLAY_CERT_URL;

        if (!certUrl) {
            console.error('FairPlay certificate URL is not configured');
            return NextResponse.json(
                { error: 'FairPlay certificate not configured' },
                { status: 500 }
            );
        }

        const response = await fetch(certUrl);

        if (!response.ok) {
            console.error('Failed to fetch FairPlay certificate', {
                status: response.status,
            });
            return NextResponse.json(
                { error: 'Failed to fetch certificate' },
                { status: response.status }
            );
        }

        const certificate = await response.arrayBuffer();

        return new NextResponse(certificate, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (error) {
        console.error('Error fetching FairPlay certificate', {
            name: error instanceof Error ? error.name : 'UnknownError',
        });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
```

- [ ] **Step 4: Run the route test again**

Run:

```bash
npm run test -- __tests__/api/fairplay-cert.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Run lint for the touched route**

Run:

```bash
npm run lint -- src/app/api/drm/fairplay-cert/route.ts __tests__/api/fairplay-cert.test.ts
```

Expected: PASS, or only inherited warnings outside these files.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/drm/fairplay-cert/route.ts __tests__/api/fairplay-cert.test.ts
git commit -m "fix: redact fairplay certificate route"
```

---

### Task 4: Verify HLS Authorization Contract Still Protects Clear Fallback

**Files:**
- Modify only if missing coverage: `__tests__/api/media-routes.test.ts`
- Modify only if tests fail: `src/app/api/hls/playlist/[videoId]/route.ts`

- [ ] **Step 1: Run existing HLS entitlement test**

Run:

```bash
npm run test -- __tests__/api/media-routes.test.ts --runInBand
```

Expected: PASS, including the test named `HLS playlist route denies unauthorized users before R2 reads`.

- [ ] **Step 2: Add explicit clear-HLS framing only if the HLS denial test is absent**

If the existing test is missing, add this test inside `describe('media route entitlement adoption')` in `__tests__/api/media-routes.test.ts`:

```typescript
test('HLS playlist route denies unauthorized clear fallback users before R2 reads', async () => {
  mockedEvaluate.mockResolvedValue({ allowed: false, code: 'NO_VIDEO_ACCESS' });
  mockedR2.send.mockResolvedValue({ Body: { transformToString: jest.fn() } });

  const { GET } = await import('@/app/api/hls/playlist/[videoId]/route');
  const response = await GET(
    new NextRequest('http://localhost/api/hls/playlist/video-1'),
    { params: Promise.resolve({ videoId: 'video-1' }) }
  );

  expect(response.status).toBe(403);
  expect(mockedR2.send).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Fix HLS route only if Step 1 or Step 2 fails**

In `src/app/api/hls/playlist/[videoId]/route.ts`, make sure entitlement is evaluated before any R2 object fetch:

```typescript
const entitlement = await evaluateMediaEntitlement({
  session,
  videoId,
});

if (!entitlement.allowed) {
  const { body, status } = mapMediaEntitlementToHttp(entitlement);
  return NextResponse.json(body, { status });
}
```

This check must happen before `r2.send(...)`.

- [ ] **Step 4: Run media route tests again**

Run:

```bash
npm run test -- __tests__/api/media-routes.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit only if files changed**

```bash
git add __tests__/api/media-routes.test.ts src/app/api/hls/playlist/[videoId]/route.ts
git commit -m "test: confirm hls entitlement fallback"
```

If no files changed because coverage already existed, do not commit.

---

### Task 5: Documentation And Full Verification

**Files:**
- Modify only if checks fail: `docs/axinom-setup.md`
- Modify only if checks fail: `docs/playback-encoding-matrix.md`
- Modify only if checks fail: `docs/env-matrix.md`
- Modify only if checks fail: `docs/vercel-staging-runbook.md`

- [ ] **Step 1: Verify docs mention the no-FairPlay fallback**

Run:

```bash
rg "clear HLS|No-FairPlay|AXINOM_ENCODING_PROFILE_CLEAR|AXINOM_FAIRPLAY_CERT_URL" docs/axinom-setup.md docs/playback-encoding-matrix.md docs/env-matrix.md docs/vercel-staging-runbook.md
```

Expected: output shows:

- `docs/axinom-setup.md` explains leaving `AXINOM_FAIRPLAY_CERT_URL` unset and using clear HLS.
- `docs/playback-encoding-matrix.md` states clear HLS is not DRM.
- `docs/env-matrix.md` marks `AXINOM_ENCODING_PROFILE_CLEAR` as required when FairPlay is absent.
- `docs/vercel-staging-runbook.md` separates FairPlay config from clear HLS fallback.

- [ ] **Step 2: Patch docs only if Step 1 shows a missing statement**

If a statement is missing, add this paragraph to the most relevant document:

```markdown
When the Axinom tenant has no Apple FPS/FairPlay certificate, leave
`AXINOM_FAIRPLAY_CERT_URL` unset and configure
`AXINOM_ENCODING_PROFILE_CLEAR`. iOS and macOS Safari should use `hlsUrlClear`
as a compatibility fallback. Clear HLS is not DRM; it remains protected by
authenticated access, HLS authorization, watermarking, session controls, and
audit telemetry.
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm run test -- __tests__/lib/playback-routing.test.ts __tests__/lib/drm-detection.test.ts __tests__/api/fairplay-cert.test.ts __tests__/api/media-routes.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 4: Run project quality gates**

Run:

```bash
npm run typecheck
```

Expected: PASS.

Run:

```bash
npm run lint
```

Expected: PASS, allowing only inherited warnings already accepted by the project.

- [ ] **Step 5: Run full test suite**

Run:

```bash
npm run test -- --runInBand
```

Expected: PASS.

- [ ] **Step 6: Run secret scan**

Run:

```bash
npm run secrets:scan
```

Expected: PASS for local non-strict scan, with no newly introduced secrets.

- [ ] **Step 7: Commit final docs only if files changed**

```bash
git add docs/axinom-setup.md docs/playback-encoding-matrix.md docs/env-matrix.md docs/vercel-staging-runbook.md
git commit -m "docs: clarify apple hls fallback"
```

If no docs changed, do not commit.

---

## Self-Review

Spec coverage:

- Clear HLS selected for iOS/Safari when `hlsUrlClear` exists: Task 1 and Task 2.
- No DRM token or FairPlay certificate fetch for clear HLS: Task 1 and Task 3.
- Unsupported Apple playback without clear HLS or FairPlay: Task 2.
- HLS authorization remains the security boundary: Task 4.
- FairPlay certificate URL not logged: Task 3.
- Documentation checks for no-FairPlay mode: Task 5.

If implementation discovers repo drift, update the exact affected task with the actual observed file names and commands before continuing.
