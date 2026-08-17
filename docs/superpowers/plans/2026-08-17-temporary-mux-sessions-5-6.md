# Temporary Mux Sessions 5 and 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route sessions 5 and 6 to their supplied temporary Mux players by canonical and deployed session title.

**Architecture:** Extend the existing immutable `PLAYBACKS` and `TITLE_ALIASES` records in the title-only resolver. A matching title deliberately takes the existing Mux watch branch before Tencent token construction, so session 5 uses Mux even with a Tencent asset and session 6 needs no Tencent media.

**Tech Stack:** TypeScript, Jest, Next.js title-based watch playback selection.

---

### Task 1: Define the new resolver contract with failing tests

**Files:**
- Modify: `__tests__/lib/temporary-mux-playback.test.ts:4-39`

**Interfaces:**
- Consumes: canonical titles `Video buổi 5` / `Video buổi 6` and deployed titles `Buổi 5 - Sáng 17.08.2026` / `Buổi 6 - Chiều 17.08.2026`.
- Produces: the exact supplied Mux playback ID, player URL, and iframe title.
- Preserves: unmatched titles, including `Video buổi 7`, return `null` and use Tencent playback.

- [ ] **Step 1: Add the failing canonical-title expectations**

Append these rows to the first `test.each` table in `__tests__/lib/temporary-mux-playback.test.ts`:

```ts
['Video buổi 5', '7kVVqLtA1IvRm3006EGQmhSsO8UY1QX3nOfiU4SHNi6E', 'https://player.mux.com/7kVVqLtA1IvRm3006EGQmhSsO8UY1QX3nOfiU4SHNi6E?metadata-video-title=video1882740513&video-title=video1882740513', 'video1882740513'],
['Video buổi 6', 'QP1WlkGeYqfT2600o9czEje8QUnnVsqcUsEIOCT0101wEI', 'https://player.mux.com/QP1WlkGeYqfT2600o9czEje8QUnnVsqcUsEIOCT0101wEI?metadata-video-title=video1276259655&video-title=video1276259655', 'video1276259655'],
```

- [ ] **Step 2: Add the failing deployed-title alias expectations**

Append these rows to the deployed-title `test.each` table:

```ts
['Buổi 5 - Sáng 17.08.2026', '7kVVqLtA1IvRm3006EGQmhSsO8UY1QX3nOfiU4SHNi6E'],
['Buổi 6 - Chiều 17.08.2026', 'QP1WlkGeYqfT2600o9czEje8QUnnVsqcUsEIOCT0101wEI'],
```

Rename the non-session regression to `keeps unmatched titles on the Tencent path` and replace its `Video buổi 5` input with `Video buổi 7`:

```ts
test('keeps unmatched titles on the Tencent path', () => {
  expect(resolveTemporaryMuxPlayback('Video buổi 7')).toBeNull();
  expect(resolveTemporaryMuxPlayback(null)).toBeNull();
  expect(resolveTemporaryMuxPlayback(undefined)).toBeNull();
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```powershell
npx.cmd jest --runInBand __tests__/lib/temporary-mux-playback.test.ts --testPathIgnorePatterns=".worktrees/"
```

Expected: FAIL because the resolver returns `null` for session 5 and session 6 before their playback records and aliases are defined.

### Task 2: Add the two exact temporary Mux overrides

**Files:**
- Modify: `src/lib/temporary-mux-playback.ts:7-39`
- Modify: `__tests__/lib/temporary-mux-playback.test.ts:4-39`

**Interfaces:**
- Consumes: the normalized keys `video buoi 5`, `video buoi 6`, `buoi 5 - sang 17.08.2026`, and `buoi 6 - chieu 17.08.2026`.
- Produces: a fresh `TemporaryMuxPlayback` object for each session; title matches continue to take priority over Tencent data.

- [ ] **Step 1: Add the exact Mux playback records**

Add these entries after `video buoi 4` in `PLAYBACKS`:

```ts
'video buoi 5': {
  playbackId: '7kVVqLtA1IvRm3006EGQmhSsO8UY1QX3nOfiU4SHNi6E',
  playerUrl: 'https://player.mux.com/7kVVqLtA1IvRm3006EGQmhSsO8UY1QX3nOfiU4SHNi6E?metadata-video-title=video1882740513&video-title=video1882740513',
  iframeTitle: 'video1882740513',
},
'video buoi 6': {
  playbackId: 'QP1WlkGeYqfT2600o9czEje8QUnnVsqcUsEIOCT0101wEI',
  playerUrl: 'https://player.mux.com/QP1WlkGeYqfT2600o9czEje8QUnnVsqcUsEIOCT0101wEI?metadata-video-title=video1276259655&video-title=video1276259655',
  iframeTitle: 'video1276259655',
},
```

- [ ] **Step 2: Add the exact deployed-title aliases**

Add these entries after the session 4 alias in `TITLE_ALIASES`:

```ts
'buoi 5 - sang 17.08.2026': 'video buoi 5',
'buoi 6 - chieu 17.08.2026': 'video buoi 6',
```

Do not change `normalizeTitle`, `resolveTemporaryMuxPlayback`, `TemporaryMuxPlayer`, or `WatchPageClient`.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```powershell
npx.cmd jest --runInBand __tests__/lib/temporary-mux-playback.test.ts --testPathIgnorePatterns=".worktrees/"
```

Expected: PASS with all six canonical mappings, all six deployed-title aliases, the unmatched-title Tencent fallback, and defensive object-copy regression.

- [ ] **Step 4: Run affected playback regressions**

Run:

```powershell
npx.cmd jest --runInBand __tests__/lib/temporary-mux-playback.test.ts __tests__/components/temporary-mux-player.test.tsx __tests__/components/watch-page-client.test.tsx __tests__/app/tos-protected-pages.test.tsx --testPathIgnorePatterns=".worktrees/"
```

Expected: PASS; component behavior remains unchanged, and the server page keeps entitlement and TOS checks before either player branch.

- [ ] **Step 5: Commit the source and test change**

```powershell
git add -- src/lib/temporary-mux-playback.ts __tests__/lib/temporary-mux-playback.test.ts
git commit -m "feat: add temporary Mux sessions 5 and 6"
```

## Final Verification

- [ ] Run `npm run typecheck`, `npm run lint`, and `git diff --check`.
- [ ] Inspect `git status --short --branch --untracked-files=no`; it must contain only the plan and source commits created for this approved work.
- [ ] In an authorized local session, verify both deployed titles display their matching Mux iframe and watermark; session 5 must not start Tencent playback. If no authorized local session is available, record that smoke test as blocked rather than bypassing entitlement.
