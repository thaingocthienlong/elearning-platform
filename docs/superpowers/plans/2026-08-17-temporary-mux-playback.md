# Temporary Mux Playback for Sessions 1–4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the supplied Mux embeds for `Video buổi 1` through `Video buổi 4` while preserving the protected watch route and Tencent playback for every other video.

**Architecture:** A server-safe resolver maps four normalized video titles to typed Mux embed data. The protected watch page resolves that data only after TOS and media-entitlement checks, skips Tencent token construction for a match, and passes the result to the client shell. The shell conditionally renders a focused iframe component; its existing DRM/Shaka component remains the non-Mux fallback.

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript, Tailwind CSS, Jest 30, React Testing Library.

## Global Constraints

- Related requirement: `TENCENT-COST-02`; this change must not invoke, schedule, configure, or reprocess Tencent media.
- Do not change Prisma models, database rows, Tencent VOD configuration, upload routes, webhook routes, or processing scripts.
- Keep session validation, TOS access, `evaluateMediaEntitlement`, enrollment/direct-access rules, and view-limit enforcement ahead of Mux selection.
- The supplied Mux embeds are public and do not provide Tencent DRM or in-player watermarking; do not label a Mux playback as DRM-protected or watermarked.
- Apply the Mux branch only to exact normalized titles `video buoi 1` through `video buoi 4`; every other title uses the existing Tencent player.

---

### Task 1: Create the title-to-Mux resolver

**Files:**
- Create: `src/lib/temporary-mux-playback.ts`
- Test: `__tests__/lib/temporary-mux-playback.test.ts`

**Interfaces:**
- Produces: `TemporaryMuxPlayback` with `playbackId`, `playerUrl`, and `iframeTitle`.
- Produces: `resolveTemporaryMuxPlayback(title: string | null | undefined): TemporaryMuxPlayback | null`.
- Consumes: A persisted `Video.title` after protected-route entitlement has loaded it.

- [ ] **Step 1: Write the failing resolver tests**

```ts
import { resolveTemporaryMuxPlayback } from '@/lib/temporary-mux-playback';

describe('resolveTemporaryMuxPlayback', () => {
  test.each([
    ['Video buổi 1', 'Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc', 'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709'],
    ['VIDEO BUỔI 2', 'rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI', 'https://player.mux.com/rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI?metadata-video-title=video1293633231&video-title=video1293633231'],
    ['Video   buổi 3', 'uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw', 'https://player.mux.com/uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw?metadata-video-title=video1634486089&video-title=video1634486089'],
    ['Video buổi 4', 'F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc', 'https://player.mux.com/F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc?metadata-video-title=video1558523669&video-title=video1558523669'],
  ])('maps %s to its approved Mux player', (title, playbackId, playerUrl) => {
    expect(resolveTemporaryMuxPlayback(title)).toMatchObject({ playbackId, playerUrl });
  });

  test('keeps non-session titles on the Tencent path', () => {
    expect(resolveTemporaryMuxPlayback('Video buổi 5')).toBeNull();
    expect(resolveTemporaryMuxPlayback(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the resolver test to verify it fails because the module is absent**

Run: `npm test -- --runInBand __tests__/lib/temporary-mux-playback.test.ts`

Expected: FAIL with `Cannot find module '@/lib/temporary-mux-playback'`.

- [ ] **Step 3: Implement the pure resolver with only the approved mappings**

```ts
export interface TemporaryMuxPlayback {
  playbackId: string;
  playerUrl: string;
  iframeTitle: string;
}

const PLAYBACKS: Readonly<Record<string, TemporaryMuxPlayback>> = {
  'video buoi 1': {
    playbackId: 'Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
    playerUrl: 'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709',
    iframeTitle: 'video1448353709',
  },
  'video buoi 2': {
    playbackId: 'rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI',
    playerUrl: 'https://player.mux.com/rcckJNkDpVjKGcZz9kD3gFQ00j75pJMZOoWm4Z01HbFkI?metadata-video-title=video1293633231&video-title=video1293633231',
    iframeTitle: 'video1293633231',
  },
  'video buoi 3': {
    playbackId: 'uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw',
    playerUrl: 'https://player.mux.com/uTpirfGCW8hzK02FkCJYvj4eXWeb4bkYKAMgG02tlH6bw?metadata-video-title=video1634486089&video-title=video1634486089',
    iframeTitle: 'video1634486089',
  },
  'video buoi 4': {
    playbackId: 'F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc',
    playerUrl: 'https://player.mux.com/F01QluvVYbhckxauduQkF69leqZ3aERdhEcGsxSEJnVc?metadata-video-title=video1558523669&video-title=video1558523669',
    iframeTitle: 'video1558523669',
  },
};

function normalizeTitle(title: string | null | undefined): string {
  return (title ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveTemporaryMuxPlayback(title: string | null | undefined): TemporaryMuxPlayback | null {
  return PLAYBACKS[normalizeTitle(title)] ?? null;
}
```

- [ ] **Step 4: Run the resolver test to verify all approved mappings pass**

Run: `npm test -- --runInBand __tests__/lib/temporary-mux-playback.test.ts`

Expected: PASS with four approved Mux mappings and one Tencent fallback case.

- [ ] **Step 5: Commit the tested resolver**

```bash
git add src/lib/temporary-mux-playback.ts __tests__/lib/temporary-mux-playback.test.ts
git commit -m "feat: map four sessions to Mux playback"
```

### Task 2: Add an accessible Mux iframe component

**Files:**
- Create: `src/components/video/TemporaryMuxPlayer.tsx`
- Test: `__tests__/components/temporary-mux-player.test.tsx`

**Interfaces:**
- Consumes: `TemporaryMuxPlayback` from `@/lib/temporary-mux-playback`.
- Produces: Default `TemporaryMuxPlayer({ playback }: { playback: TemporaryMuxPlayback })` component.
- Does not call an API, manage playback state, or render the Tencent watermark/DRM player.

- [ ] **Step 1: Write the failing iframe component test**

```tsx
import { render, screen } from '@testing-library/react';
import TemporaryMuxPlayer from '@/components/video/TemporaryMuxPlayer';

test('renders the approved Mux iframe without a frame border', () => {
  render(
    <TemporaryMuxPlayer
      playback={{
        playbackId: 'Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
        playerUrl: 'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709',
        iframeTitle: 'video1448353709',
      }}
    />,
  );

  const frame = screen.getByTitle('video1448353709');
  expect(frame).toHaveAttribute('src', 'https://player.mux.com/Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc?metadata-video-title=video1448353709&video-title=video1448353709');
  expect(frame).toHaveAttribute('allow', 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;');
  expect(frame).toHaveAttribute('allowfullscreen');
});
```

- [ ] **Step 2: Run the component test to verify it fails because the component is absent**

Run: `npm test -- --runInBand __tests__/components/temporary-mux-player.test.tsx`

Expected: FAIL with `Cannot find module '@/components/video/TemporaryMuxPlayer'`.

- [ ] **Step 3: Implement the visual-only iframe component**

```tsx
'use client';

import type { TemporaryMuxPlayback } from '@/lib/temporary-mux-playback';

export default function TemporaryMuxPlayer({ playback }: { playback: TemporaryMuxPlayback }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
      <iframe
        src={playback.playerUrl}
        title={playback.iframeTitle}
        className="h-full w-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    </div>
  );
}
```

- [ ] **Step 4: Run the component test to verify the exact supplied embed contract**

Run: `npm test -- --runInBand __tests__/components/temporary-mux-player.test.tsx`

Expected: PASS with the exact `src`, `allow`, and fullscreen attributes asserted.

- [ ] **Step 5: Commit the tested Mux player component**

```bash
git add src/components/video/TemporaryMuxPlayer.tsx __tests__/components/temporary-mux-player.test.tsx
git commit -m "feat: render temporary Mux player"
```

### Task 3: Wire protected watch playback to Mux without invoking Tencent for matches

**Files:**
- Modify: `src/app/watch/[videoId]/page.tsx:50-162`
- Modify: `src/components/course/WatchPageClient.tsx:14-138`
- Create: `__tests__/components/watch-page-client.test.tsx`
- Modify: `__tests__/app/tos-protected-pages.test.tsx:1-72`

**Interfaces:**
- Consumes: `resolveTemporaryMuxPlayback(video.title)` only after `evaluateMediaEntitlement` returns `allowed: true`.
- Produces: `temporaryMuxPlayback: TemporaryMuxPlayback | null` prop on `WatchPageClient`.
- Preserves: The existing `DRMPlayerWrapper` call with `selectWatchPlaybackSources(...)` for a `null` Mux result.

- [ ] **Step 1: Write failing watch-shell and server-page regression tests**

```tsx
// __tests__/components/watch-page-client.test.tsx
jest.mock('next/dynamic', () => () => (props: { videoId: string }) => (
  <div data-testid="tencent-player" data-video-id={props.videoId} />
));

test('renders the Mux iframe and removes the DRM label for a temporary Mux playback', () => {
  render(<WatchPageClient {...baseProps} temporaryMuxPlayback={muxPlayback} />);
  expect(screen.getByTitle('video1448353709')).toBeInTheDocument();
  expect(screen.queryByText('DRM')).not.toBeInTheDocument();
  expect(screen.queryByTestId('tencent-player')).not.toBeInTheDocument();
});

test('keeps the Tencent player and DRM label for a non-Mux playback', () => {
  render(<WatchPageClient {...baseProps} temporaryMuxPlayback={null} />);
  expect(screen.getByTestId('tencent-player')).toHaveAttribute('data-video-id', 'video-1');
  expect(screen.getByText('DRM')).toBeInTheDocument();
});

// __tests__/app/tos-protected-pages.test.tsx
test('does not construct a Tencent token after entitlement selects Video buổi 1 for Mux', async () => {
  mockedRequireTos.mockResolvedValue(undefined);
  mockedEvaluate.mockResolvedValue(allowedEntitlementWith({
    title: 'Video buổi 1',
    tencentFileId: 'tencent-file-1',
  }));
  mockedPrisma.allowedEmail.findUnique.mockResolvedValue(null);
  mockedPrisma.video.findMany.mockResolvedValue([]);
  mockedPrisma.watchRecord.findMany.mockResolvedValue([]);

  await WatchPage({ params: Promise.resolve({ videoId: 'video-1' }) });

  expect(mockedCreateToken).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the watch regression tests to verify they fail before the new prop and branch exist**

Run: `npm test -- --runInBand __tests__/components/watch-page-client.test.tsx __tests__/app/tos-protected-pages.test.tsx`

Expected: FAIL because `temporaryMuxPlayback` is absent from `WatchPageClientProps` and the Mux iframe branch does not exist.

- [ ] **Step 3: Implement the protected server/client handoff**

```tsx
// src/app/watch/[videoId]/page.tsx
import { resolveTemporaryMuxPlayback } from '@/lib/temporary-mux-playback';

const temporaryMuxPlayback = resolveTemporaryMuxPlayback(video.title);
let initialDrmToken = '';
let appleFallbackHlsUrl = video.hlsUrlClear ?? null;

if (!temporaryMuxPlayback && video.tencentFileId) {
  try {
    initialDrmToken = createTencentDrmToken({
      fileId: video.tencentFileId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
  } catch (error) {
    serverLog.error('Failed to create initial Tencent DRM token', error);
  }
}

if (!temporaryMuxPlayback && video.hlsUrlClear && video.tencentAppleFallbackDrmType === 'SimpleAES' && video.tencentFileId) {
  try {
    const fallbackToken = createTencentDrmToken({
      fileId: video.tencentFileId,
      expiresAt: createTencentAppleFallbackTokenExpiry({ durationSeconds: video.duration }),
      multiDrm: false,
    });
    appleFallbackHlsUrl = createTencentSimpleAesPlaybackUrl(video.hlsUrlClear, fallbackToken);
  } catch (error) {
    appleFallbackHlsUrl = null;
    serverLog.error('Failed to create Tencent Apple fallback token', error);
  }
}

// In the existing WatchPageClient element
temporaryMuxPlayback={temporaryMuxPlayback}
```

```tsx
// src/components/course/WatchPageClient.tsx
import TemporaryMuxPlayer from '@/components/video/TemporaryMuxPlayer';
import type { TemporaryMuxPlayback } from '@/lib/temporary-mux-playback';

interface WatchPageClientProps {
  videoId: string;
  otp: string;
  playbackInfo: { url: string; drmLicenseUrl: string };
  courseTitle: string;
  sidebarVideos: any[];
  currentVideoId: string;
  viewCount: number;
  viewLimit: number | null;
  watermarkText: string;
  drmToken: string;
  dashUrl: string | null;
  hlsUrl: string | null;
  hlsUrlClear: string | null;
  isFairPlayConfigured: boolean;
  chatLog?: any;
  temporaryMuxPlayback: TemporaryMuxPlayback | null;
}

{temporaryMuxPlayback ? (
  <TemporaryMuxPlayer playback={temporaryMuxPlayback} />
) : (
  <DRMPlayerWrapper
    dashUrl={playbackSources.dashUrl}
    hlsUrl={playbackSources.hlsUrl}
    drmToken={playbackSources.drmToken}
    videoId={videoId}
    viewCount={viewCount}
    viewLimit={viewLimit}
    watermarkText={watermarkText}
    requireHD={false}
    isClearHlsFallback={playbackSources.isClearHlsFallback}
    isFairPlayConfigured={isFairPlayConfigured}
    onFullscreenChange={setIsVideoFullscreen}
  />
)}
```

Update the header badges so `DRM` and `watermarked` render only when `temporaryMuxPlayback` is `null`; render one truthful `Temporary Mux` badge in the Mux branch. Do not remove the surrounding `SecurityWrapper`, session validator, sidebar, chat log, or server-side entitlement call.

- [ ] **Step 4: Run the focused regression tests and preserve the existing TOS denial test**

Run: `npm test -- --runInBand __tests__/components/watch-page-client.test.tsx __tests__/app/tos-protected-pages.test.tsx`

Expected: PASS for the Mux iframe branch, Tencent fallback branch, no-Tencent-token Mux regression, and the existing TOS-before-entitlement denial regression.

- [ ] **Step 5: Commit the protected watch integration**

```bash
git add src/app/watch/[videoId]/page.tsx src/components/course/WatchPageClient.tsx __tests__/components/watch-page-client.test.tsx __tests__/app/tos-protected-pages.test.tsx
git commit -m "feat: use Mux for four protected session videos"
```

### Task 4: Verify the full application change

**Files:**
- Verify only: files changed in Tasks 1–3 and `docs/superpowers/specs/2026-08-17-temporary-mux-playback-design.md`

**Interfaces:**
- Confirms: Four exact Mux URLs are wired, non-Mux videos retain Tencent playback, and no code path starts Tencent processing.

- [ ] **Step 1: Run the complete affected Jest suite**

Run: `npm test -- --runInBand __tests__/lib/temporary-mux-playback.test.ts __tests__/components/temporary-mux-player.test.tsx __tests__/components/watch-page-client.test.tsx __tests__/app/tos-protected-pages.test.tsx __tests__/lib/tencent-vod.test.ts __tests__/api/tencent-upload-process.test.ts`

Expected: PASS with no failed suites.

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck; npm run lint; npm run build`

Expected: each command exits with code `0`; lint may retain only pre-existing warnings.

- [ ] **Step 3: Inspect the final diff and protected-flow invariants**

Run: `git diff HEAD~3..HEAD --check; git diff HEAD~3..HEAD -- src/app/watch/[videoId]/page.tsx src/components/course/WatchPageClient.tsx src/lib/temporary-mux-playback.ts src/components/video/TemporaryMuxPlayer.tsx`

Expected: no whitespace errors; exactly four Mux playback IDs; Tencent token construction guarded by the no-Mux branch; no upload, webhook, Prisma, or processing-script changes.

- [ ] **Step 4: Perform a credential-free manual browser smoke when the local app is runnable**

Run: `npm run dev`

Expected: after an authorized user opens a matching `Video buổi 1`–`4` watch URL, the page shows the supplied Mux iframe and `Temporary Mux` badge; another video shows the Tencent player and DRM/watermark badges. Record `blocked: requires an authorized local session and database` instead of bypassing access controls when those are unavailable.
