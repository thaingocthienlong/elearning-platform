# Temporary Mux Watermark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all temporary Mux embeds the same learner watermark component and settings flow as Tencent playback.

**Architecture:** Preserve the supplied Mux iframe and render the shared `Watermark` component above it in a positioned container. `WatchPageClient` passes its existing server-derived `watermarkText` to the Mux component, while `Watermark` gains an iframe-container layout fallback that preserves its current local-video calculations.

**Tech Stack:** Next.js client components, React, TypeScript, Tailwind CSS, Jest, React Testing Library.

## Global Constraints

- Keep the four Mux player URLs, iframe permission string, and `allowFullScreen` unchanged.
- Reuse the existing `Watermark` component and `/api/watermark/settings`; do not add a data model, endpoint, or admin setting.
- Preserve Tencent `DRMPlayerWrapper` behavior and its watermark path unchanged.
- Treat all client-side watermark behavior as deterrence, not a hard protection boundary.
- Native fullscreen inside the cross-origin Mux iframe remains outside the parent page's watermark overlay.

---

### Task 1: Support iframe-backed watermark containers

**Files:**
- Create: `__tests__/components/watermark.test.tsx`
- Modify: `src/components/video/Watermark.tsx:119-210`

**Interfaces:**
- Consumes: `WatermarkProps { text: string; containerId: string; aggressiveMode?: boolean; forceFullscreenMode?: boolean; isIOS?: boolean }`.
- Produces: the existing watermark overlay, with a calculated size and position when `containerId` contains either a local `<video>` or a cross-origin `<iframe>`.

- [ ] **Step 1: Write the failing iframe-container layout test**

Create a component test that installs lightweight `ResizeObserver` and `MutationObserver` stubs, defines `clientWidth` as `640` and `clientHeight` as `360`, and renders an iframe and a watermark in the same container. Assert that the overlay renders its text and uses the 640px container width to calculate a 20px font size.

```tsx
render(
  <div id="temporary-mux-player-test">
    <iframe title="Mux player" />
    <Watermark text="Learner - 555-0100" containerId="temporary-mux-player-test" />
  </div>,
);

const watermark = screen.getByText('Learner - 555-0100');
expect(watermark).toHaveStyle({ fontSize: '20px' });
```

- [ ] **Step 2: Run the test to verify the current iframe behavior fails**

Run:

```powershell
npx.cmd jest --runInBand __tests__/components/watermark.test.tsx --testPathIgnorePatterns=".worktrees/"
```

Expected: FAIL because `Watermark` returns before layout calculation when the container lacks a local `<video>` element.

- [ ] **Step 3: Implement the container-size fallback without changing video layout behavior**

In `Watermark`'s `updateLayout`, retain the early return only for a missing container. Keep `const video = container.querySelector('video')`, initialize `vRect` from `container.clientWidth` and `container.clientHeight`, and make the letterbox/pillarbox branch conditional on `video?.videoWidth && video?.videoHeight`.

```tsx
const video = container.querySelector('video');
const containerWidth = container.clientWidth;
const containerHeight = container.clientHeight;
let vRect = { width: containerWidth, height: containerHeight, left: 0, top: 0 };

if (video?.videoWidth && video?.videoHeight) {
  // Retain the current ratio and letterbox/pillarbox calculation unchanged.
}
```

Leave the `loadedmetadata` and `resize` listeners conditional on the local video element as they are.

- [ ] **Step 4: Run the focused test to verify the fallback passes**

Run:

```powershell
npx.cmd jest --runInBand __tests__/components/watermark.test.tsx --testPathIgnorePatterns=".worktrees/"
```

Expected: PASS, with the watermark text rendered at 20px for the iframe-only container.

- [ ] **Step 5: Commit the self-contained fallback**

```powershell
git add -- src/components/video/Watermark.tsx __tests__/components/watermark.test.tsx
git commit -m "fix: size watermark for iframe players"
```

### Task 2: Pass the Tencent watermark flow through the temporary Mux player

**Files:**
- Modify: `src/components/video/TemporaryMuxPlayer.tsx:3-17`
- Modify: `src/components/course/WatchPageClient.tsx:99-133`
- Modify: `__tests__/components/temporary-mux-player.test.tsx:1-28`
- Modify: `__tests__/components/watch-page-client.test.tsx:1-66`

**Interfaces:**
- Consumes: `TemporaryMuxPlayback` and the existing `watermarkText: string` from `WatchPageClientProps`.
- Produces: `TemporaryMuxPlayer({ playback, watermarkText })`, rendering the unchanged Mux iframe and `Watermark({ text: watermarkText, containerId })` in the same container.

- [ ] **Step 1: Write failing propagation tests**

Mock `@/components/video/Watermark` in the temporary-player test so it exposes `text` and `containerId`, then add `watermarkText="Learner - 555-0100"` to the component render. Assert both the existing iframe contract and this shared watermark contract.

```tsx
jest.mock('@/components/video/Watermark', () => function WatermarkMock(
  { text, containerId }: { text: string; containerId: string },
) {
  return <div data-testid="watermark" data-container-id={containerId}>{text}</div>;
});

expect(screen.getByTestId('watermark')).toHaveTextContent('Learner - 555-0100');
expect(screen.getByTestId('watermark')).toHaveAttribute(
  'data-container-id',
  'temporary-mux-player-Rb99oLfhARO02STw01e7uuFnMpI6elTFJQWGIcr0024ETc',
);
```

Mock `TemporaryMuxPlayer` in the watch-page test, render the temporary Mux branch, and assert it receives `baseProps.watermarkText`.

```tsx
jest.mock('@/components/video/TemporaryMuxPlayer', () => function TemporaryMuxPlayerMock(
  { watermarkText }: { watermarkText: string },
) {
  return <div data-testid="mux-player-watermark">{watermarkText}</div>;
});

expect(screen.getByTestId('mux-player-watermark')).toHaveTextContent('Learner');
```

- [ ] **Step 2: Run the Mux component tests to verify they fail**

Run:

```powershell
npx.cmd jest --runInBand __tests__/components/temporary-mux-player.test.tsx __tests__/components/watch-page-client.test.tsx --testPathIgnorePatterns=".worktrees/"
```

Expected: FAIL because `TemporaryMuxPlayer` has no `watermarkText` prop and `WatchPageClient` passes only `playback`.

- [ ] **Step 3: Implement shared watermark rendering**

Change the temporary player signature to accept a required `watermarkText: string`. Derive a stable container ID from the Mux playback ID, set that ID and `relative` on the existing outer player container, and render `Watermark` after the iframe.

```tsx
const containerId = `temporary-mux-player-${playback.playbackId}`;

<div id={containerId} className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
  <iframe /* retain the existing src, title, class, allow, and allowFullScreen */ />
  <Watermark text={watermarkText} containerId={containerId} />
</div>
```

Update the temporary branch of `WatchPageClient` to render:

```tsx
<TemporaryMuxPlayer playback={temporaryMuxPlayback} watermarkText={watermarkText} />
```

Do not alter the Tencent branch, its DRM inputs, or its `DRMPlayerWrapper` props.

- [ ] **Step 4: Run the Mux component tests to verify they pass**

Run:

```powershell
npx.cmd jest --runInBand __tests__/components/temporary-mux-player.test.tsx __tests__/components/watch-page-client.test.tsx --testPathIgnorePatterns=".worktrees/"
```

Expected: PASS, including the unchanged iframe permissions and the new same-text propagation checks.

- [ ] **Step 5: Run the focused playback regression suite**

Run:

```powershell
npx.cmd jest --runInBand __tests__/lib/temporary-mux-playback.test.ts __tests__/components/watermark.test.tsx __tests__/components/temporary-mux-player.test.tsx __tests__/components/watch-page-client.test.tsx __tests__/app/tos-protected-pages.test.tsx __tests__/lib/tencent-vod.test.ts __tests__/api/tencent-upload-process.test.ts --testPathIgnorePatterns=".worktrees/"
```

Expected: PASS. Confirm both the temporary Mux mapping and non-Mux Tencent fallback remain covered.

- [ ] **Step 6: Commit the Mux integration**

```powershell
git add -- src/components/video/TemporaryMuxPlayer.tsx src/components/course/WatchPageClient.tsx __tests__/components/temporary-mux-player.test.tsx __tests__/components/watch-page-client.test.tsx
git commit -m "feat: add watermark to temporary Mux playback"
```

## Final Verification

- [ ] Run `git diff --check` and inspect `git status --short --branch --untracked-files=no` to ensure only the planned commits are present.
- [ ] Push the two source commits and the earlier approved spec/plan commits to `origin/codex/tencent-prod-test-setup`.
- [ ] Confirm the resulting remote commit SHA and report the Mux native-fullscreen overlay limitation explicitly.
