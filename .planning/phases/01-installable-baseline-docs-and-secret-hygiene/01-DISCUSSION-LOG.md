# Phase 1: Installable Baseline, Docs, and Secret Hygiene - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 1-Installable Baseline, Docs, and Secret Hygiene
**Areas discussed:** Bootstrap contract, Environment docs shape, Test baseline, Secret hygiene boundary, Setup docs audience

---

## Bootstrap Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Local baseline only | `npm install`, Prisma generate, lint/typecheck/build/test scripts, and `npm run dev` can run with documented placeholder/local env values. | |
| Local + service checks | Local baseline plus documented verification scripts for MongoDB, Redis, Axinom, Azure/R2, Zoom, SMTP, and Sentry, but real credentials are optional. | ✓ |
| Staging-like bootstrap | Clean checkout should be able to run a near-staging setup once real service credentials are provided. | |

**User's choice:** Local + service checks.
**Notes:** Missing credentials should skip by default with clear messages, but fail in strict/CI mode.

---

## Environment Docs Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Single `.env.example` | One placeholder file with comments; simple, but can get crowded. | |
| Env matrix document | Table listing var, service, secret/public, local/staging need, example placeholder, and notes. | |
| Both | `.env.example` for copy/paste plus a detailed env matrix doc as the source of truth. | ✓ |

**User's choice:** Both.
**Notes:** Env matrix should be grouped by service, with columns for sensitivity and local/staging applicability.

---

## Test Baseline

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest | Modern, fast TypeScript-friendly baseline for services/routes; can ignore or convert existing Jest setup. | |
| Jest | Aligns with existing `jest.setup.ts` and `test-plan.md`, lower conceptual drift. | ✓ |
| Planner discretion | Let the planner inspect more deeply and choose the least disruptive route. | |

**User's choice:** Jest.
**Notes:** Phase 1 tests should include the runner plus a small set of representative examples, not the full security suite.

---

## Secret Hygiene Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Inventory only | List paths and risk categories without moving/deleting anything. | |
| Inventory + scanning | Add secret scanning/checks and docs, but leave files in place. | ✓ |
| Quarantine ignored artifacts | Move likely-sensitive ignored artifacts into a documented local quarantine folder. | |
| Delete ignored artifacts | Remove likely-sensitive ignored artifacts from the workspace. | |

**User's choice:** Inventory + scanning.
**Notes:** Secret scanning should be a repeatable local script/gate. Do not move or delete inherited artifacts in Phase 1.

---

## Setup Docs Audience

| Option | Description | Selected |
|--------|-------------|----------|
| You as maintainer | Direct, technical, assumes repo access and ability to run commands. | |
| Future technical staff | More explanatory, includes background and troubleshooting for another developer/admin. | |
| Both | Quick maintainer path first, then deeper staff handoff sections. | ✓ |

**User's choice:** Both.
**Notes:** Use a docs-first organization: keep `README.md` concise and put detailed setup/runbooks under `docs/`.

---

## the agent's Discretion

- Exact docs file names under `docs/`.
- Exact strict-mode interface for service verification scripts.
- Exact representative Jest tests within Phase 1 scope.
- Exact local secret scanning implementation.

## Deferred Ideas

- Full entitlement/security tests are deferred to Phase 2.
- Axinom implementation validation is deferred to Phase 3.
- Zoom SDK upgrade is deferred to Phase 4.
- Database performance work is deferred to Phase 5.
- Staging acceptance is deferred to Phase 6.
- Academic frontend redesign is deferred to Phase 7.
