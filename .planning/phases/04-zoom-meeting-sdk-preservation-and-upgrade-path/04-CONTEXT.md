# Phase 4: Zoom Meeting SDK Preservation and Upgrade Path - Context

**Gathered:** 2026-05-06T08:07:00.0000000+07:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 preserves the existing authenticated Zoom meeting join flow while making signature generation, meeting configuration, SDK asset ownership, upgrade steps, role controls, and smoke testing maintainable. It does not add new Zoom product features.

</domain>

<decisions>
## Implementation Decisions

### Zoom Flow And SDK Source
- **D-01:** Preserve the current authenticated `/meeting` page plus iframe launch flow. Do not replace it with a direct React SDK page in this phase.
- **D-02:** Treat the installed `@zoom/meetingsdk` package as the intended source of truth where feasible. Quarantine copied sample/static SDK assets unless verification proves one is still required by the preserved iframe flow.
- **D-03:** Verify the installed and served SDK versions against official Zoom documentation and changelog before upgrading. Upgrade only when the preserved flow can be tested locally or in staging.
- **D-04:** Default learners to Zoom role `0`. Only users passing the app's existing admin permission model may receive host-capable role `1`.

### Signature Authorization And Meeting Configuration
- **D-05:** Use a server-owned single meeting configuration for this phase. The signature API should not trust client-supplied meeting number, passcode, or role.
- **D-06:** Fail closed when Zoom SDK credentials or meeting configuration are missing or mismatched. Do not generate a signature. Show users a generic meeting unavailable state and direct maintainers to setup diagnostics through docs/logs.
- **D-07:** Reuse the existing admin permission model for Zoom host capability. Do not add a separate host allowlist in Phase 4.
- **D-08:** The browser should send a minimal request to the signature API: no trusted meeting config and no role. The server derives meeting number, role, identity, watermark, and passcode handling.

### Zoom Asset Cleanup And Upgrade Procedure
- **D-09:** Identify the live served Zoom asset path before moving anything. Keep one maintained path and quarantine duplicate/sample SDK trees outside served public paths after verification.
- **D-10:** Do not force latest blindly. Compare static/CDN/package versions to official current docs and changelog, then upgrade only when smokeable.
- **D-11:** Preserve notes for quarantined copies if they contain undocumented local patches.
- **D-12:** Produce a maintainer runbook covering source of truth, official docs checked, exact upgrade steps, smoke test, and rollback path.

### Smoke Test And Rollback Boundaries
- **D-13:** Verify with automated API tests for signature auth, role, and config behavior plus a documented manual staging smoke for real Zoom join, camera/mic permission, passcode, identity, watermark, and leave behavior.
- **D-14:** Phase completion is blocked by passing secure signature/API tests and a documented manual smoke path. A successful real Zoom join may be marked as requiring staging credentials.
- **D-15:** Plan a versioned rollback to the last working Zoom asset/package set. Preserve the prior working path until smoke passes.
- **D-16:** Do not add scheduling UI, per-course meetings, recordings, attendance sync, Zoom OAuth, or full Zoom management in Phase 4.

### the agent's Discretion
The agent may choose exact helper/module boundaries, test structure, docs filenames, and quarantine directory naming, as long as the decisions above and the Phase 4 requirements remain satisfied.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning And Requirements
- `.planning/PROJECT.md` — Product intent, stabilization-first constraint, Zoom preservation decision, and no broad frontend/database scope in this phase.
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, and requirement mapping.
- `.planning/REQUIREMENTS.md` — `ZOOM-01` through `ZOOM-06` and `TEST-04`.
- `.planning/research/ARCHITECTURE.md` — Existing Zoom architecture notes and boundary rules.

### Current Zoom Implementation
- `src/app/api/zoom/signature/route.ts` — Current server-side Meeting SDK JWT generation, watermark lookup, and role/config risks.
- `src/app/meeting/page.tsx` — Current authenticated meeting page, signature fetch, iframe launch, user identity, and watermark params.
- `public/zoom-meeting.html` — Current static iframe client, SDK script/CSS paths, join behavior, leave handling, and watermark overlay.
- `public/zoom-client-view/` — Existing copied Zoom client-view assets that must be inspected before quarantine.

### Official Zoom References
- `https://developers.zoom.us/docs/meeting-sdk/web/` — Current Zoom Meeting SDK Web overview.
- `https://developers.zoom.us/docs/meeting-sdk/auth/` — Server-side Meeting SDK authorization/signature guidance.
- `https://developers.zoom.us/docs/meeting-sdk/web/client-view/` — Client View implementation reference.
- `https://developers.zoom.us/docs/meeting-sdk/web/component-view/` — Component View reference for comparison only; not selected for Phase 4 replacement.
- `https://developers.zoom.us/changelog/meeting-sdk/web/4.0.7/` — Current changelog reference captured during Phase 4 scouting; re-check official changelog during planning/implementation because SDK versions are time-sensitive.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/zoom/signature/route.ts`: Keep server-side JWT generation concept, but move session validation before signature generation and stop trusting request `role` or meeting config.
- `src/app/meeting/page.tsx`: Preserve authenticated page and iframe launch behavior, but change the signature request to a minimal payload and improve unavailable/error states.
- `public/zoom-meeting.html`: Preserve the static iframe client if it remains the verified live path, while aligning its SDK source and docs with the retained source of truth.

### Established Patterns
- Server-owned authorization decisions are the project standard after Phase 2. Zoom signatures must follow the same pattern: session first, server-derived role/config, fail closed.
- Integration setup should be validated and documented without printing secrets, matching the Axinom and setup patterns from Phases 1 and 3.
- External-provider changes should have a staging smoke path because real credentials and tenant behavior cannot be fully simulated in unit tests.

### Integration Points
- `/meeting` authenticates via NextAuth and redirects unauthenticated users.
- `/api/zoom/signature` connects NextAuth session, Zoom SDK env vars, Prisma whitelist/watermark settings, and JWT signing.
- Static Zoom assets currently exist in multiple locations: `public/zoom`, `public/lib/zoom`, `public/zoom-client-view`, and `zoom-webapp`. Planning must identify the live path before quarantine.

</code_context>

<specifics>
## Specific Ideas

The accepted direction is a narrow hardening and maintainability pass: preserve the current user-visible join flow, reduce spoofable inputs, make the SDK path understandable, and document a repeatable upgrade/rollback process.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Zoom Meeting SDK Preservation and Upgrade Path*
*Context gathered: 2026-05-06T08:07:00.0000000+07:00*
