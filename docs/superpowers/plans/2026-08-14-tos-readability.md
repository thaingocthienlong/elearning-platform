# TOS Readability Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing TOS consent dialog substantially larger, darker, and easier to read while preserving its access-control behavior.

**Architecture:** Keep the current component and interaction logic intact. Apply a scoped responsive typography/layout refinement in `TosConsentDialog`, protected by one component regression test and verified on real desktop and phone browser surfaces.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS, Radix/shadcn Dialog and ScrollArea, Jest 30, Testing Library.

## Global Constraints

- Legal body text is 35px at `lg`, exactly 2.5 times the current 14px size.
- Legal body text scales as 20px / 24px / 35px across phone / tablet / desktop.
- Legal body uses `text-foreground` and `leading-[1.55]`.
- Dialog width is capped at `80rem` with viewport gutters.
- Legal copy measure is capped at `68ch`.
- Preserve all TOS copy, translation keys, `TOS_VERSION`, cookie behavior, scroll gating, confirmation, acceptance, refusal, and retry logic.
- Modify no shared UI primitive and add no dependency.
- Preserve existing untracked `.agents/`, `.superpowers/`, and `codex-plugins/`; never stage them.

---

## File Map

| Path | Action | Responsibility |
| --- | --- | --- |
| `__tests__/components/tos-consent-dialog.test.tsx` | Modify | Prevent regression to small or muted legal copy. |
| `src/components/tos/TosConsentDialog.tsx` | Modify | Apply responsive dialog, type, spacing, and contrast classes. |

### Task 1: Enlarge and strengthen the TOS reading surface

**Files:**
- Modify: `__tests__/components/tos-consent-dialog.test.tsx`
- Modify: `src/components/tos/TosConsentDialog.tsx:94-174`

**Interfaces:**
- Consumes: Existing `TosConsentDialog` props, translations, Radix primitives, and scroll gate.
- Produces: The same component API and behavior with the approved responsive visual contract.

- [ ] **Step 1: Write the failing readability regression test**

Add this test inside the existing `describe('TosConsentDialog', ...)` block:

```tsx
test('renders legal copy as an enlarged high-contrast reading surface', () => {
  render(<TosConsentDialog />);

  const legalCopy = screen.getByRole('list');
  expect(legalCopy).toHaveClass(
    'text-xl',
    'sm:text-2xl',
    'lg:text-[2.1875rem]',
    'leading-[1.55]',
    'text-foreground',
  );
  expect(legalCopy).not.toHaveClass('text-sm', 'text-muted-foreground');
  expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-[80rem]');
});
```

This test catches a real regression: restoring `text-sm`, muted legal copy, or the narrow desktop dialog makes the approved reading surface disappear.

- [ ] **Step 2: Run the test and verify the expected red state**

Run:

```powershell
npm test -- --runInBand __tests__/components/tos-consent-dialog.test.tsx
```

Expected: the new test fails because the legal list still has `text-sm text-muted-foreground` and the dialog still has `sm:max-w-2xl`.

- [ ] **Step 3: Apply the minimal scoped visual implementation**

Use these exact responsive roles in `TosConsentDialog.tsx`:

```tsx
<DialogContent
  showCloseButton={false}
  className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[80rem] gap-4 overflow-y-auto p-4 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[80rem] sm:gap-5 sm:p-6"
  onEscapeKeyDown={(event) => event.preventDefault()}
  onPointerDownOutside={(event) => event.preventDefault()}
>
```

```tsx
<DialogTitle className="text-2xl leading-tight sm:text-3xl lg:text-[2.75rem]">
  {t('tosTitle')}
</DialogTitle>
<DialogDescription className="text-base leading-relaxed text-foreground/75 sm:text-lg lg:text-xl">
  {t('tosDescription')}
</DialogDescription>
```

```tsx
<ScrollArea
  ref={scrollAreaRef}
  role="region"
  aria-label={t('tosScrollRegionLabel')}
  tabIndex={0}
  className="h-[min(36dvh,20rem)] rounded-md border sm:h-[min(46dvh,30rem)] lg:h-[min(58dvh,42rem)]"
  onKeyDown={(event) => {
    if (event.key !== 'End') return;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]',
    );
    if (!viewport) return;
    event.preventDefault();
    viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    markReadAtEnd(viewport);
  }}
  onScrollCapture={(event) => {
    if (event.target instanceof HTMLElement) markReadAtEnd(event.target);
  }}
>
  <ul className="mx-auto max-w-[68ch] list-disc space-y-6 px-6 py-5 pl-10 text-xl leading-[1.55] text-foreground sm:space-y-8 sm:px-8 sm:py-6 sm:pl-12 sm:text-2xl lg:px-10 lg:py-8 lg:pl-16 lg:text-[2.1875rem]">
    {CONTENT_KEYS.map((contentKey) => (
      <li key={contentKey}>{t(contentKey)}</li>
    ))}
  </ul>
</ScrollArea>
```

Replace the supporting roles with these exact elements while retaining their
existing state and handlers:

```tsx
<p
  className="text-base leading-relaxed text-foreground/80 sm:text-lg lg:text-xl"
  aria-live="polite"
>
  {t(hasRead ? 'tosReadComplete' : 'tosReadInstruction')}
</p>

<div className="flex items-start gap-3">
  <Checkbox
    id="tos-confirmation"
    className="mt-0.5 size-5 sm:size-6"
    checked={confirmed}
    disabled={!hasRead || submitting}
    onCheckedChange={(checked) => setConfirmed(checked === true)}
  />
  <label
    htmlFor="tos-confirmation"
    className="text-base leading-relaxed text-foreground sm:text-lg lg:text-xl"
  >
    {t('tosConfirmation')}
  </label>
</div>

{error && (
  <p role="alert" className="text-base text-destructive sm:text-lg">
    {error}
  </p>
)}

<DialogFooter className="gap-2 sm:gap-3">
  <Button
    type="button"
    variant="outline"
    className="h-11 px-5 text-base sm:h-12 sm:px-6 sm:text-lg"
    disabled={submitting}
    onClick={onDecline}
  >
    {t('tosDecline')}
  </Button>
  <Button
    type="button"
    className="h-11 px-5 text-base sm:h-12 sm:px-6 sm:text-lg"
    disabled={!hasRead || !confirmed || submitting}
    onClick={accept}
  >
    {t(submitting ? 'tosSubmitting' : 'tosAgree')}
  </Button>
</DialogFooter>
```

- [ ] **Step 4: Run the component test and verify green**

Run:

```powershell
npm test -- --runInBand __tests__/components/tos-consent-dialog.test.tsx
```

Expected: all component tests pass.

- [ ] **Step 5: Run scoped automated verification**

Run:

```powershell
npm test -- --runInBand __tests__/components/tos-consent-dialog.test.tsx __tests__/app/tos-protected-pages.test.tsx __tests__/proxy-tos.test.ts
npx eslint src/components/tos/TosConsentDialog.tsx __tests__/components/tos-consent-dialog.test.tsx
npm run typecheck
git diff --check
```

Expected: every command exits `0`; no TOS interaction or protected-route behavior changes.

- [ ] **Step 6: Run design detector and browser verification**

Run the final detector once:

```powershell
node 'C:\Users\Vien Phuong Nam\.agents\skills\impeccable\scripts\detect.mjs' --json --scope type src/components/tos/TosConsentDialog.tsx
```

Expected: no unexplained finding.

Render `/tos-approval` and verify:

1. At 1920x994, computed legal body is 35px, dark foreground, comfortably wrapped, and the dialog stays inside viewport gutters.
2. At 390x844, computed legal body is 20px, no horizontal overflow exists, the inner terms region scrolls, and confirmation/actions remain reachable.
3. At 200% browser zoom, the responsive scale drops below 35px and all controls remain reachable.
4. Scroll-to-end still unlocks the checkbox; Agree remains disabled until checked.

- [ ] **Step 7: Commit the implementation**

```powershell
git add -- src/components/tos/TosConsentDialog.tsx __tests__/components/tos-consent-dialog.test.tsx docs/superpowers/plans/2026-08-14-tos-readability.md
git commit -m "fix: improve TOS readability"
```
