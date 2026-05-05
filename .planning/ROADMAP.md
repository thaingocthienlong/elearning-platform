# Roadmap: Secure Streaming Platform Rescue

## Overview

This roadmap stabilizes a handed-over secure academic streaming platform by making it installable, testable, secure, and deployable before broader redesign. The path starts with reproducible setup and verification, then fixes entitlement and security gaps, validates Axinom DRM and Zoom integrations, improves Prisma/MongoDB performance, proves staging readiness, redesigns the academic frontend, and leaves maintainers with durable operations playbooks.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Installable Baseline, Docs, and Secret Hygiene** - Maintainers can install, configure, verify, and handle sensitive artifacts from a clean checkout.
- [ ] **Phase 2: Central Authorization and Core Security Fixes** - Media, support, admin, logging, and security-event flows enforce server-owned security rules consistently.
- [ ] **Phase 3: Axinom Trial Setup and DRM/Encoding Validation** - Maintainers can configure and exercise the official Axinom DRM/Encoding path through Shaka playback.
- [ ] **Phase 4: Zoom Meeting SDK Preservation and Upgrade Path** - Meetings keep the current authenticated join flow while signatures, roles, and SDK assets are made maintainable.
- [ ] **Phase 5: Prisma/MongoDB Performance and Data Cleanup** - Current MongoDB implementation is profiled, bounded, indexed, and optimized before any migration decision.
- [ ] **Phase 6: Vercel Staging Deployment and Smoke Suite** - Staging can be deployed and accepted through documented env, callback, build, log, and smoke checks.
- [ ] **Phase 7: Academic Frontend Redesign** - Existing routes and workflows receive a formal institute-style UI with responsive and screenshot coverage.
- [ ] **Phase 8: Maintainer Operations and Hardening Backlog** - Maintainers have subsystem, upgrade, readiness, and production-hardening guidance after staging readiness.

## Phase Details

### Phase 1: Installable Baseline, Docs, and Secret Hygiene
**Goal**: Maintainers can bootstrap and verify the project from a clean checkout without relying on inherited local state or stale README claims.
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07, TEST-01
**Success Criteria** (what must be TRUE):
  1. Maintainer can install dependencies, generate Prisma client, and prepare the MongoDB-backed schema using documented Node, npm, and Prisma commands.
  2. Maintainer can start the local dev server using placeholder-safe environment documentation that identifies every required variable, owner, secret status, and local/staging need.
  3. Maintainer can run root lint, typecheck, build, and test commands, with route/service test tooling installed and documented.
  4. Maintainer can see setup documentation that corrects PostgreSQL drift and explains how sensitive env files, DRM keys, media artifacts, and placeholders must be handled.
**Plans**: TBD

### Phase 2: Central Authorization and Core Security Fixes
**Goal**: Users and admins encounter consistent server-side authorization, support, logging, and audit behavior across critical security surfaces.
**Depends on**: Phase 1
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11, TEST-02, TEST-03, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):
  1. User media access succeeds or fails consistently across watch page, DRM token, HLS playlist, license, heartbeat, and future media routes using one server-only entitlement decision.
  2. User denial responses for protected media and token routes are consistent and do not expose sensitive operational details.
  3. User support tickets derive authenticated identity from the session, limit and redact diagnostics before persistence, and enforce distributed rate limits suitable for Vercel.
  4. Admin destructive security actions require explicit protection and leave an audit trail, while application logs avoid raw token, key, email, and credential leakage.
  5. Automated tests cover media entitlement allow/deny paths, DRM/HLS route authorization, support protections, and malformed webhook signatures.
**Plans**: TBD

### Phase 3: Axinom Trial Setup and DRM/Encoding Validation
**Goal**: Maintainers can configure Axinom from official documentation and verify authorized DRM playback through the repo's Shaka integration.
**Depends on**: Phase 2
**Requirements**: DRM-01, DRM-02, DRM-03, DRM-04, DRM-05, DRM-06, DRM-07, DRM-08, DRM-09
**Success Criteria** (what must be TRUE):
  1. Maintainer can follow official-doc-based Axinom DRM and Encoding setup guides for portal setup, communication keys, license URLs, service credentials, storage, profiles, webhook URLs, and staging values.
  2. Maintainer can map Axinom portal values to repo env vars through validation that flags missing values and legacy aliases.
  3. Authorized playback uses centralized, server-only, short-lived, scoped, officially signed Axinom License Service Messages and Shaka sends entitlement tokens only with license requests.
  4. Maintainer can tell whether the local DRM license endpoint is disabled/quarantined or backed by real key custody, so it is not mistaken for production DRM.
  5. A staging test video can be encoded, published, authorized, and played through explicit Axinom operational fields and safe webhook signature handling.
**Plans**: TBD

### Phase 4: Zoom Meeting SDK Preservation and Upgrade Path
**Goal**: Users can join Zoom meetings through the existing authenticated flow while maintainers have a single, current SDK path and verified role controls.
**Depends on**: Phase 3
**Requirements**: ZOOM-01, ZOOM-02, ZOOM-03, ZOOM-04, ZOOM-05, ZOOM-06, TEST-04
**Success Criteria** (what must be TRUE):
  1. Maintainer can understand the current meeting flow, including session requirements, meeting/passcode configuration, role selection, signature route, iframe/static client behavior, and watermark identity.
  2. User meeting signatures are generated server-side only, never expose SDK secrets in the browser, and prevent ordinary learners from minting host-capable signatures.
  3. Maintainer can identify one retained Zoom SDK asset/source-of-truth path and follow a documented upgrade procedure based on official current documentation.
  4. User can launch a staging Zoom meeting through the preserved authenticated flow after SDK cleanup or upgrade, verified by automated tests or a documented smoke test.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Prisma/MongoDB Performance and Data Cleanup
**Goal**: Maintainers can operate the current Prisma/MongoDB implementation with bounded, profiled, indexed data access before considering migration.
**Depends on**: Phase 4
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07
**Success Criteria** (what must be TRUE):
  1. Maintainer can see that MongoDB is the implemented primary database and that setup docs no longer claim PostgreSQL as the current datasource.
  2. User watch pages avoid redundant video queries and unnecessary broad reads while preserving existing playback behavior.
  3. Admin analytics and read-heavy summaries use bounded ranges, pagination, aggregation, indexes, or short-lived caching instead of broad application-side reductions.
  4. Ticket diagnostics, security events, and watermark settings have documented bounds or retention behavior that avoids unbounded document growth and ambiguous latest-row reads.
  5. Maintainer can review profiling evidence before any database migration is considered.
**Plans**: TBD

### Phase 6: Vercel Staging Deployment and Smoke Suite
**Goal**: Maintainers can deploy and accept a staging environment that exercises the real auth, media, DRM, Zoom, Redis, storage, webhook, and admin surfaces.
**Depends on**: Phase 5
**Requirements**: STAGE-01, STAGE-02, STAGE-03, STAGE-04, STAGE-05, STAGE-06, STAGE-07, TEST-07
**Success Criteria** (what must be TRUE):
  1. Maintainer can follow a staging deployment runbook for Vercel or the chosen staging host, including required external services and access expectations.
  2. Maintainer can configure a staging env var matrix for database, auth, Redis, storage, Axinom, Zoom, SMTP/support, reCAPTCHA, Sentry, and public player URLs.
  3. Maintainer can configure external callbacks and origins for Google OAuth, Axinom webhooks, Zoom, Azure/R2 CORS, and Vercel domains.
  4. Staging build verifies Prisma generation, lint, typecheck, tests, and Next build before acceptance.
  5. Staging smoke checks cover auth, course access, playback, DRM token issuance, HLS access, Zoom meeting launch, support ticket creation, Redis, storage, Axinom webhook readiness, logs, Sentry, and known production gaps.
**Plans**: TBD

### Phase 7: Academic Frontend Redesign
**Goal**: Users experience the existing course, watch, admin, meeting, support, auth, and system workflows through a formal institute-style frontend without workflow regressions.
**Depends on**: Phase 6
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Success Criteria** (what must be TRUE):
  1. User sees a formal institute/academic visual direction across primary frontend routes while existing navigation and workflows remain intact.
  2. User can browse courses and course details with clear academic hierarchy, credible learning context, and visible access state.
  3. User can use the watch page with DRM playback, watermarking, sidebar/course navigation, and security controls preserved in the new visual system.
  4. Admin users can scan and operate dense admin pages without marketing-style layout getting in the way.
  5. Meeting, support, auth, and system pages match the redesigned style and pass mobile, desktop, accessibility, and visual regression or screenshot checks.
**Plans**: TBD
**UI hint**: yes

### Phase 8: Maintainer Operations and Hardening Backlog
**Goal**: Maintainers can understand, check, upgrade, and harden the platform after staging readiness without overstating production guarantees.
**Depends on**: Phase 7
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05
**Success Criteria** (what must be TRUE):
  1. Maintainer can understand the app's major subsystems: auth, entitlement, DRM, video processing, storage, Zoom, Redis, database, support, and admin flows.
  2. Maintainer can follow vendor upgrade playbooks for Axinom, Zoom, Next.js, Prisma, Shaka, and deployment dependencies.
  3. Maintainer can see documented limits of client-side anti-recording controls and distinguish deterrence from enforceable server, DRM, watermark, and audit layers.
  4. Maintainer can use health or checklist documentation to assess Axinom, Zoom, Redis, storage, database, OAuth, Sentry, and webhook readiness.
  5. Maintainer can find remaining production-hardening items separately from completed staging readiness.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Installable Baseline, Docs, and Secret Hygiene | 0/TBD | Not started | - |
| 2. Central Authorization and Core Security Fixes | 0/TBD | Not started | - |
| 3. Axinom Trial Setup and DRM/Encoding Validation | 0/TBD | Not started | - |
| 4. Zoom Meeting SDK Preservation and Upgrade Path | 0/TBD | Not started | - |
| 5. Prisma/MongoDB Performance and Data Cleanup | 0/TBD | Not started | - |
| 6. Vercel Staging Deployment and Smoke Suite | 0/TBD | Not started | - |
| 7. Academic Frontend Redesign | 0/TBD | Not started | - |
| 8. Maintainer Operations and Hardening Backlog | 0/TBD | Not started | - |

## Coverage

| Requirement | Phase |
|-------------|-------|
| SETUP-01 | Phase 1 |
| SETUP-02 | Phase 1 |
| SETUP-03 | Phase 1 |
| SETUP-04 | Phase 1 |
| SETUP-05 | Phase 1 |
| SETUP-06 | Phase 1 |
| SETUP-07 | Phase 1 |
| TEST-01 | Phase 1 |
| SEC-01 | Phase 2 |
| SEC-02 | Phase 2 |
| SEC-03 | Phase 2 |
| SEC-04 | Phase 2 |
| SEC-05 | Phase 2 |
| SEC-06 | Phase 2 |
| SEC-07 | Phase 2 |
| SEC-08 | Phase 2 |
| SEC-09 | Phase 2 |
| SEC-10 | Phase 2 |
| SEC-11 | Phase 2 |
| TEST-02 | Phase 2 |
| TEST-03 | Phase 2 |
| TEST-05 | Phase 2 |
| TEST-06 | Phase 2 |
| DRM-01 | Phase 3 |
| DRM-02 | Phase 3 |
| DRM-03 | Phase 3 |
| DRM-04 | Phase 3 |
| DRM-05 | Phase 3 |
| DRM-06 | Phase 3 |
| DRM-07 | Phase 3 |
| DRM-08 | Phase 3 |
| DRM-09 | Phase 3 |
| ZOOM-01 | Phase 4 |
| ZOOM-02 | Phase 4 |
| ZOOM-03 | Phase 4 |
| ZOOM-04 | Phase 4 |
| ZOOM-05 | Phase 4 |
| ZOOM-06 | Phase 4 |
| TEST-04 | Phase 4 |
| DATA-01 | Phase 5 |
| DATA-02 | Phase 5 |
| DATA-03 | Phase 5 |
| DATA-04 | Phase 5 |
| DATA-05 | Phase 5 |
| DATA-06 | Phase 5 |
| DATA-07 | Phase 5 |
| STAGE-01 | Phase 6 |
| STAGE-02 | Phase 6 |
| STAGE-03 | Phase 6 |
| STAGE-04 | Phase 6 |
| STAGE-05 | Phase 6 |
| STAGE-06 | Phase 6 |
| STAGE-07 | Phase 6 |
| TEST-07 | Phase 6 |
| UI-01 | Phase 7 |
| UI-02 | Phase 7 |
| UI-03 | Phase 7 |
| UI-04 | Phase 7 |
| UI-05 | Phase 7 |
| UI-06 | Phase 7 |
| UI-07 | Phase 7 |
| OPS-01 | Phase 8 |
| OPS-02 | Phase 8 |
| OPS-03 | Phase 8 |
| OPS-04 | Phase 8 |
| OPS-05 | Phase 8 |

**Coverage validated:** 66/66 v1 requirements mapped exactly once.

---
*Roadmap created: 2026-05-05*
