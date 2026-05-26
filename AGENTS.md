# Agent Instructions

This repository uses GSD planning artifacts under `.planning/`.

## Required Context

Before planning or implementing project work, read:

1. `.planning/STATE.md` - current phase, progress, blockers, and resume context.
2. `.planning/PROJECT.md` - product intent, core value, requirements, constraints, and decisions.
3. `.planning/ROADMAP.md` - phase order, goals, success criteria, and requirement mapping.
4. `.planning/REQUIREMENTS.md` - checkable requirement IDs and traceability.
5. Relevant `.planning/codebase/*.md` and `.planning/research/*.md` documents for the phase.

## Current Project

Project: Secure Streaming Platform Rescue

Core value: Maintainers can reliably run, secure, deploy, and evolve the platform without guessing how its DRM, Zoom, database, authentication, and streaming flows fit together.

Current focus: Phase 1 - Installable Baseline, Docs, and Secret Hygiene.

## Workflow Rules

- Work phase by phase in roadmap order unless the user explicitly changes priorities.
- For implementation work, plan the active phase before executing it.
- Keep requirement IDs visible in plans, tests, commits, and verification notes.
- Treat `.planning/PROJECT.md` decisions and constraints as authoritative unless the user updates them.
- Preserve existing user changes. Do not revert unrelated edits.
- Commit planning artifacts separately from source-code changes when Git tracking is enabled.
- Do not read, print, copy, or commit secret values from env files, key files, DRM artifacts, service account files, certificates, or media keys.

## Caveman Communication Rule

- Trigger the `caveman` skill for agent-authored prose by default, including answers, status updates, plans, specs, docs, reviews, summaries, and handoff notes.
- Use `caveman full` unless the user requests another level, such as `lite`, `ultra`, `wenyan-lite`, `wenyan-full`, or `wenyan-ultra`.
- Keep code, commands, exact error text, file paths, API names, commit messages, and PR text precise and normally formatted.
- Temporarily drop caveman compression when security warnings, irreversible-action confirmations, legal/compliance text, public-facing product copy, or ordered multi-step instructions would become ambiguous. Resume caveman style afterward.
- Stop using caveman only when the user says `stop caveman` or `normal mode`.

## Project-Specific Constraints

- Stabilize first: install, docs, tests, and security fixes come before the academic frontend redesign.
- Optimize the current Prisma/MongoDB implementation before considering database migration.
- Preserve Axinom DRM and Zoom providers for v1 while making setup, staging, and upgrade paths reproducible.
- Use official documentation when planning or changing Axinom, Zoom, Next.js, Prisma, Shaka, or Vercel behavior.
- Treat client-side anti-recording controls as deterrence and telemetry, not as a hard security boundary.
