---
name: feature-or-bugfix-with-tests
description: Workflow command scaffold for feature-or-bugfix-with-tests in elearning-platform.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-or-bugfix-with-tests

Use this workflow when working on **feature-or-bugfix-with-tests** in `elearning-platform`.

## Goal

Implements or fixes a feature in the codebase and updates or adds corresponding tests.

## Common Files

- `src/lib/safari-fairplay-readiness.ts`
- `src/hooks/player/useShakaPlayer.ts`
- `src/lib/drm-detection.ts`
- `scripts/verify-safari-fairplay.ts`
- `__tests__/lib/safari-fairplay-readiness.test.ts`
- `__tests__/lib/drm-detection.test.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit or create implementation file(s) in src/ or scripts/
- Edit or create corresponding test file(s) in __tests__/
- Commit both implementation and test changes together

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.