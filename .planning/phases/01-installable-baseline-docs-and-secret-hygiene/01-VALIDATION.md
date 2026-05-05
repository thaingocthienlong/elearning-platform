---
phase: 1
slug: installable-baseline-docs-and-secret-hygiene
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-05
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with `next/jest`, `jest-environment-jsdom`, and existing `jest.setup.ts` |
| **Config file** | `jest.config.ts` (created in Wave 0) |
| **Quick run command** | `npm test -- --runInBand` |
| **Full suite command** | `npm run lint && npm run typecheck && npm test && npm run build` |
| **Estimated runtime** | ~120 seconds after dependencies are installed |

---

## Sampling Rate

- **After every task commit:** Run the narrow automated command listed for the task.
- **After every plan wave:** Run `npm run lint && npm run typecheck && npm test`.
- **Before `$gsd-verify-work`:** Run `npm run lint && npm run typecheck && npm test && npm run build && npm run secrets:scan`.
- **Max feedback latency:** 120 seconds for normal test feedback; build may exceed this on first install.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | SETUP-06 | — | N/A | unit/script | `node -e "const p=require('./package.json'); for (const s of ['typecheck','test','test:watch','prisma:generate','db:push','verify:setup','verify:services','verify:services:strict','secrets:inventory','secrets:scan']) if (!p.scripts[s]) process.exit(1)"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | TEST-01 | — | N/A | unit/config | `npm test -- package-scripts --runInBand` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | SETUP-03 | T-1-01 | Placeholder-only env examples | docs/unit contract creation | `powershell -NoProfile -Command 'if (!(Test-Path "__tests__/env/env-matrix.test.ts")) { exit 1 }; foreach ($pattern in @("DATABASE_URL","NEXT_PUBLIC_ZOOM_MEETING_ID","server secret")) { if (!(Select-String -Path "__tests__/env/env-matrix.test.ts" -Pattern $pattern -Quiet)) { exit 1 } }'` | task creates test first | ⬜ pending |
| 1-03-02 | 03 | 1 | SETUP-04 | T-1-02 | Env sensitivity and service ownership documented | docs/unit | `npm test -- env` | task creates test first | ⬜ pending |
| 1-02-01 | 02 | 2 | SETUP-01, SETUP-03 | — | Local startup uses placeholder-safe env docs | smoke/script | `npm run verify:setup` | depends on W0 + Plan 03 | ⬜ pending |
| 1-02-02 | 02 | 2 | SETUP-02 | — | N/A | smoke/script | `npm run prisma:generate` | depends on W0 | ⬜ pending |
| 1-04-01 | 04 | 3 | SETUP-05 | — | N/A | docs/unit contract creation | `powershell -NoProfile -Command 'if (!(Test-Path "__tests__/docs/readme-and-secret-hygiene.test.ts")) { exit 1 }; foreach ($pattern in @("PostgreSQL","readFileSync","--redact")) { if (!(Select-String -Path "__tests__/docs/readme-and-secret-hygiene.test.ts" -Pattern $pattern -Quiet)) { exit 1 } }'` | task creates test first | ⬜ pending |
| 1-04-02 | 04 | 3 | SETUP-07 | T-1-01 | Secret inventory is path-only and scanner output redacted | script | `npm run secrets:inventory && npm run secrets:scan` | depends on W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Jest dependencies in `devDependencies`.
- [ ] `zod` as a direct dependency if shared env/script validation uses it.
- [ ] `jest.config.ts` - Next-aware Jest config using `next/jest`.
- [ ] `__tests__/scripts/package-scripts.test.ts` - validates root script surface for SETUP-06.

Env and docs contract tests remain Nyquist-compliant inside their owning plans: Plan 03 creates `__tests__/env/env-matrix.test.ts` before accepting `.env.example` or `docs/env-matrix.md`, and Plan 04 creates `__tests__/docs/readme-and-secret-hygiene.test.ts` before accepting README or secret-hygiene changes.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real external service connectivity | SETUP-03, SETUP-04 | Real credentials are optional in local setup and belong to later Axinom/Zoom/staging phases. | Run optional service verification commands with real credentials in non-strict local mode and strict mode; confirm missing credentials skip locally and fail in strict mode. |
| Human readability of maintainer docs | SETUP-05, SETUP-07 | Automated docs checks can verify required sections, not clarity. | Read `README.md` and detailed `docs/` setup files; confirm README is concise and detailed runbooks are discoverable. |

---

## Threat References

| Threat Ref | Threat | Required Mitigation |
|------------|--------|---------------------|
| T-1-01 | Secret values are committed through examples, inventory output, or scanner output. | Use placeholders only; inventory paths/categories only; redact scanner output. |
| T-1-02 | Public and secret env vars are confused, causing browser exposure of server secrets. | Document sensitivity and `NEXT_PUBLIC_` browser exposure rules in the env matrix. |
| T-1-03 | Optional service checks hide staging gaps. | Default local checks may skip, but strict/CI mode must fail on missing required service env vars. |
| T-1-04 | Stale setup docs point maintainers to PostgreSQL instead of the implemented MongoDB datasource. | Correct README and detailed docs to describe Prisma MongoDB and `prisma db push`. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all MISSING references.
- [x] No watch-mode flags.
- [x] Feedback latency target documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-05
