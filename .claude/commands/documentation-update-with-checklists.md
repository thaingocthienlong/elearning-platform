---
name: documentation-update-with-checklists
description: Workflow command scaffold for documentation-update-with-checklists in elearning-platform.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /documentation-update-with-checklists

Use this workflow when working on **documentation-update-with-checklists** in `elearning-platform`.

## Goal

Updates documentation files, especially checklists and plans, often alongside test updates for documentation.

## Common Files

- `docs/axinom-staging-checklist.md`
- `docs/staging-smoke-checklist.md`
- `docs/superpowers/plans/2026-05-14-safari-fairplay-drm-validation.md`
- `__tests__/docs/staging-docs.test.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit or create markdown documentation files in docs/
- Optionally, update or add related test files in __tests__/docs/
- Commit documentation and test changes together

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.