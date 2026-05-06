# Phase 4: Zoom Meeting SDK Preservation and Upgrade Path - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06T08:07:00.0000000+07:00
**Phase:** 4-Zoom Meeting SDK Preservation and Upgrade Path
**Areas discussed:** Zoom Flow And SDK Source, Signature Authorization And Meeting Configuration, Zoom Asset Cleanup And Upgrade Procedure, Smoke Test And Rollback Boundaries

---

## Zoom Flow And SDK Source

| Question | Options Considered | User's Choice |
|----------|--------------------|---------------|
| What should Phase 4 preserve? | Keep current authenticated `/meeting` page + iframe launch flow; replace with direct React SDK page | Keep current authenticated `/meeting` page + iframe launch flow |
| What is the SDK source of truth? | Use installed `@zoom/meetingsdk`; keep `public/zoom*` assets; keep `zoom-webapp` sample | Use installed `@zoom/meetingsdk`; quarantine copied sample/static SDK assets unless still required |
| How aggressive should the upgrade be? | Verify first then upgrade if needed/testable; force latest immediately | Verify first, then upgrade only if needed and testable |
| How should host/admin roles work? | Learners role `0` and admins role `1`; keep client-supplied role; disable host signatures | Learners role `0`; only admins may request host-capable role `1` |

**Notes:** User selected all recommended decisions for this area.

---

## Signature Authorization And Meeting Configuration

| Question | Options Considered | User's Choice |
|----------|--------------------|---------------|
| How should meeting configuration be controlled? | Server-owned single meeting; server-owned allowlist; database-backed meetings | Server-owned single meeting |
| How strict should setup failure behavior be? | Fail closed; allow page load but disable join; fallback to client config | Fail closed with clear maintainer error |
| What should count as admin/host permission for role `1`? | Existing admin check; separate Zoom host allowlist; disable host signatures | Existing admin check only |
| What should the browser send to the signature API? | Minimal request; meeting ID echo only; keep current shape with validation | Minimal request |

**Notes:** User selected the recommended secure/server-owned path for every decision.

---

## Zoom Asset Cleanup And Upgrade Procedure

| Question | Options Considered | User's Choice |
|----------|--------------------|---------------|
| How should duplicated Zoom SDK asset trees be handled? | Quarantine duplicates after identifying live path; leave duplicates but document source of truth; replace static iframe assets with bundled React import now | Quarantine duplicates after identifying the live path |
| How should the SDK version change be handled? | Docs-verified upgrade only; pin current working version; force latest immediately | Docs-verified upgrade only |
| Where should old Zoom samples go? | Quarantine outside served public paths; delete unused samples outright; keep samples in `public/` with warnings | Quarantine outside served public paths |
| How detailed should upgrade docs be? | Maintainer runbook; short README section; code comments only | Maintainer runbook |

**Notes:** User prioritized maintainability and rollback over a blind latest-version replacement.

---

## Smoke Test And Rollback Boundaries

| Question | Options Considered | User's Choice |
|----------|--------------------|---------------|
| How should the preserved flow be verified? | Automated API tests plus manual staging smoke; manual smoke only; automated browser smoke only | Automated API tests plus manual staging smoke |
| What should block completion? | Secure API tests and documented manual smoke path; successful real Zoom join; no tests | Secure API tests and documented manual smoke path |
| What rollback should be planned? | Versioned rollback to last working asset/package set; git revert only; no rollback path | Versioned rollback to last working asset/package set |
| What is outside Phase 4? | No new meeting product features; allow small meeting UX additions; expand to full Zoom management | No new meeting product features |

**Notes:** User kept Phase 4 focused on current-flow hardening, with real Zoom join smoke dependent on available staging credentials.

---

## the agent's Discretion

The agent may choose exact helper/module boundaries, test structure, docs filenames, and quarantine directory naming.

## Deferred Ideas

None.
