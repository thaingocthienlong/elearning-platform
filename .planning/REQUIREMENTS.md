# Requirements: Secure Streaming Platform Rescue

**Defined:** 2026-05-05
**Core Value:** Maintainers can reliably run, secure, deploy, and evolve the platform without guessing how its DRM, Zoom, database, authentication, and streaming flows fit together.

## v1 Requirements

Requirements for the rescue and modernization milestone. Each requirement must be implemented, documented, and verified before being marked complete.

### Setup And Documentation

- [x] **SETUP-01**: Maintainer can install dependencies from a clean checkout using documented Node and npm versions.
- [x] **SETUP-02**: Maintainer can generate the Prisma client and prepare the MongoDB-backed schema using documented commands.
- [x] **SETUP-03**: Maintainer can start the local development server with placeholder-safe environment documentation.
- [x] **SETUP-04**: Maintainer can identify every required environment variable, its owning service, whether it is secret, and whether it is needed for local or staging.
- [x] **SETUP-05**: Maintainer can follow setup documentation that corrects stale README claims about PostgreSQL versus the implemented Prisma MongoDB datasource.
- [x] **SETUP-06**: Maintainer can run lint, typecheck, build, and test commands from root package scripts.
- [x] **SETUP-07**: Repository documents how to handle sensitive env files, DRM keys, media artifacts, and sample placeholders without committing secrets.

### Verification And Tests

- [x] **TEST-01**: Automated test tooling is installed and documented for route/service unit tests.
- [x] **TEST-02**: Critical media entitlement allow/deny paths are covered by automated tests.
- [x] **TEST-03**: DRM token and HLS authorization routes are covered by automated tests.
- [ ] **TEST-04**: Zoom signature generation and meeting access checks are covered by automated tests or a documented smoke test.
- [x] **TEST-05**: Support ticket identity and rate-limit protections are covered by automated tests.
- [x] **TEST-06**: Webhook signature validation handles malformed signatures without 500 responses.
- [ ] **TEST-07**: Staging smoke checks cover auth, course access, playback, DRM token issuance, HLS access, Zoom meeting launch, support ticket creation, Redis, storage, and Axinom webhook readiness.

### Security And Authorization

- [x] **SEC-01**: Media authorization uses one server-only entitlement helper shared by watch page, DRM token route, HLS playlist route, license route, heartbeat, and future media routes.
- [x] **SEC-02**: Entitlement decisions consistently enforce user identity, course enrollment, open-course access, direct video access, publication/deletion state, time windows, and view limits.
- [x] **SEC-03**: Protected media and token routes return consistent denial reasons without leaking sensitive operational details.
- [x] **SEC-04**: HLS playlist access is denied unless the same entitlement rules as the watch page pass.
- [x] **SEC-05**: DRM token issuance respects direct-access validity windows and does not issue broad or stale entitlements.
- [x] **SEC-06**: Support ticket submission derives authenticated email from the session and rejects or audits mismatches.
- [x] **SEC-07**: Support ticket diagnostics have payload size limits and recursive sensitive-field redaction before persistence.
- [x] **SEC-08**: Ticket-specific rate limiting uses a distributed store suitable for Vercel/serverless staging.
- [x] **SEC-09**: Security event destructive actions are audited and protected by explicit admin confirmation or a narrower permission boundary.
- [x] **SEC-10**: Application logging avoids raw token, key, email, and credential leakage through structured or redacted logging.
- [x] **SEC-11**: Secret-like files in the workspace are inventoried, ignored, and documented for rotation/removal decisions before staging.

### Axinom DRM And Video Processing

- [x] **DRM-01**: Maintainer has an official-doc-based Axinom DRM trial setup guide covering portal setup, communication key ID/value, license service URLs, and required secrets.
- [x] **DRM-02**: Maintainer has an official-doc-based Axinom Encoding setup guide covering service credentials, storage, encoding profiles, webhook URLs, and staging configuration.
- [x] **DRM-03**: Repo env validation clearly maps Axinom portal values to the app's Axinom environment variables and flags missing or legacy aliases.
- [x] **DRM-04**: Axinom License Service Message generation is centralized, server-only, scoped to authorized key IDs, short-lived, and signed according to official Axinom documentation.
- [x] **DRM-05**: Shaka Player integration sends Axinom entitlement tokens only with license requests and uses documented Widevine, PlayReady, and FairPlay license/certificate URLs.
- [x] **DRM-06**: Local DRM license endpoint is either implemented with real key custody or clearly disabled/quarantined so maintainers do not mistake it for production DRM.
- [x] **DRM-07**: Axinom webhook signature verification rejects invalid signatures consistently and handles malformed signatures safely.
- [x] **DRM-08**: Axinom operational IDs and statuses are stored in explicit video fields instead of overloading user-facing descriptions.
- [x] **DRM-09**: A staging test video can be encoded, published, authorized, and played through the documented Axinom/Shaka flow.

### Zoom Meetings

- [ ] **ZOOM-01**: Current authenticated meeting flow is documented, including session requirements, meeting number/passcode configuration, role selection, signature route, iframe/static page behavior, and watermark/user identity handling.
- [ ] **ZOOM-02**: Zoom Meeting SDK integration is checked against official current documentation before upgrading.
- [ ] **ZOOM-03**: Zoom signatures are generated server-side only and never expose SDK secrets to the browser.
- [ ] **ZOOM-04**: Learner and admin/host meeting roles are validated so ordinary users cannot mint host-capable signatures.
- [ ] **ZOOM-05**: The repo has one maintained Zoom SDK asset/source-of-truth path and documented upgrade procedure.
- [ ] **ZOOM-06**: Meeting launch has a staging smoke test that preserves the current user flow after SDK cleanup or upgrade.

### Database And Performance

- [ ] **DATA-01**: Current Prisma MongoDB provider choice is documented and setup docs no longer claim PostgreSQL as the implemented primary database.
- [ ] **DATA-02**: Watch page query flow avoids redundant video queries and unnecessary broad reads.
- [ ] **DATA-03**: Admin analytics queries use bounded ranges, pagination, aggregation, or short-lived caching to avoid broad application-side reductions.
- [ ] **DATA-04**: MongoDB indexes are reviewed and updated for high-traffic session, entitlement, watch, video, admin, ticket, and security-event queries.
- [ ] **DATA-05**: Ticket diagnostics and security events have documented retention or payload bounds to avoid unbounded document growth.
- [ ] **DATA-06**: Watermark settings update/read behavior avoids ambiguous latest-row selection or unbounded history growth.
- [ ] **DATA-07**: Database migration is evaluated only after profiling documents a concrete blocker that optimization cannot address.

### Staging Deployment

- [ ] **STAGE-01**: Maintainer has a staging deployment runbook for Vercel or the chosen staging host.
- [ ] **STAGE-02**: Staging env var matrix covers database, auth, Redis, storage, Axinom, Zoom, SMTP/support, reCAPTCHA, Sentry, and public player URLs.
- [ ] **STAGE-03**: Staging deployment documents external callback and origin configuration for Google OAuth, Axinom webhooks, Zoom, Azure/R2 CORS, and Vercel domains.
- [ ] **STAGE-04**: Staging build verifies Prisma generation, lint, typecheck, tests, and Next build.
- [ ] **STAGE-05**: Staging smoke test verifies key user and admin flows before a release is accepted.
- [ ] **STAGE-06**: Staging logs and Sentry setup avoid exposing secrets while preserving useful failure context.
- [ ] **STAGE-07**: Known production gaps are documented separately from staging readiness.

### Academic Frontend Redesign

- [ ] **UI-01**: Frontend visual direction is redesigned into a formal institute/academic style while preserving existing routes and workflows.
- [ ] **UI-02**: Course browsing and course detail pages support a credible academic learning experience with clear hierarchy and access state.
- [ ] **UI-03**: Watch page preserves DRM playback, watermarking, sidebar/course navigation, and security controls while receiving the new visual system.
- [ ] **UI-04**: Admin pages remain dense, scannable, and operational rather than marketing-style.
- [ ] **UI-05**: Meeting page preserves the existing Zoom join flow while matching the academic visual system.
- [ ] **UI-06**: Support/auth/system pages match the redesigned institute style and remain accessible on mobile and desktop.
- [ ] **UI-07**: Visual regression or screenshot checks cover primary redesigned pages after implementation.

### Maintainer Operations

- [ ] **OPS-01**: Maintainer docs explain the app's major subsystems, including auth, entitlement, DRM, video processing, storage, Zoom, Redis, database, support, and admin flows.
- [ ] **OPS-02**: Vendor upgrade playbooks exist for Axinom, Zoom, Next.js, Prisma, Shaka, and deployment dependencies.
- [ ] **OPS-03**: Operations docs define what client-side anti-recording controls can and cannot guarantee.
- [ ] **OPS-04**: Admin health or checklist documentation identifies readiness of Axinom, Zoom, Redis, storage, database, OAuth, Sentry, and webhooks.
- [ ] **OPS-05**: Remaining production-hardening items are captured after staging readiness is achieved.

## v2 Requirements

Deferred to future milestones after staging readiness.

### Database Migration

- **DBMIG-01**: Evaluate migrating from MongoDB to PostgreSQL or another database if profiling and staging data show MongoDB cannot meet requirements.
- **DBMIG-02**: Build a migration plan with data validation, rollback, downtime expectations, and Prisma schema changes if migration is approved.

### Production Hardening

- **PROD-01**: Define production incident response, credential rotation, backup, and monitoring policies.
- **PROD-02**: Add production load and concurrency testing for watch, admin, Zoom, and support flows.
- **PROD-03**: Establish compliance-specific controls if the institute has formal regulatory requirements.

### Advanced Product Features

- **ADV-01**: Add cohort or academic term management if required by real users.
- **ADV-02**: Add richer analytics exports after dashboard performance is stable.
- **ADV-03**: Add granular watermark/security policy presets after baseline controls are validated.

## Out of Scope

Explicitly excluded from v1 to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Immediate database migration | User selected optimize-existing first; migration before tests and profiling adds unnecessary risk. |
| Replacing Axinom DRM | Current backend depends on Axinom trial services; first milestone must make that path reproducible. |
| Replacing Zoom | Current meeting workflow must be preserved and upgraded, not replaced. |
| Production launch certification | The target is staging deployment readiness; production hardening is later. |
| Client-side recording prevention as a guarantee | Client controls are deterrence/telemetry; server entitlement, DRM, watermarking, and audit are enforceable layers. |
| Broad frontend rewrite before stabilization | Redesign waits until install, docs, tests, security, Axinom, Zoom, and staging contracts are stable enough to catch regressions. |

## Traceability

Roadmap-validated mapping. Every v1 requirement maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Complete |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Complete |
| SETUP-04 | Phase 1 | Complete |
| SETUP-05 | Phase 1 | Complete |
| SETUP-06 | Phase 1 | Complete |
| SETUP-07 | Phase 1 | Complete |
| TEST-01 | Phase 1 | Complete |
| SEC-01 | Phase 2 | Complete |
| SEC-02 | Phase 2 | Complete |
| SEC-03 | Phase 2 | Complete |
| SEC-04 | Phase 2 | Complete |
| SEC-05 | Phase 2 | Complete |
| SEC-06 | Phase 2 | Complete |
| SEC-07 | Phase 2 | Complete |
| SEC-08 | Phase 2 | Complete |
| SEC-09 | Phase 2 | Complete |
| SEC-10 | Phase 2 | Complete |
| SEC-11 | Phase 2 | Complete |
| TEST-02 | Phase 2 | Complete |
| TEST-03 | Phase 2 | Complete |
| TEST-05 | Phase 2 | Complete |
| TEST-06 | Phase 2 | Complete |
| DRM-01 | Phase 3 | Complete |
| DRM-02 | Phase 3 | Complete |
| DRM-03 | Phase 3 | Complete |
| DRM-04 | Phase 3 | Complete |
| DRM-05 | Phase 3 | Complete |
| DRM-06 | Phase 3 | Complete |
| DRM-07 | Phase 3 | Complete |
| DRM-08 | Phase 3 | Complete |
| DRM-09 | Phase 3 | Complete |
| ZOOM-01 | Phase 4 | Pending |
| ZOOM-02 | Phase 4 | Pending |
| ZOOM-03 | Phase 4 | Pending |
| ZOOM-04 | Phase 4 | Pending |
| ZOOM-05 | Phase 4 | Pending |
| ZOOM-06 | Phase 4 | Pending |
| TEST-04 | Phase 4 | Pending |
| DATA-01 | Phase 5 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 5 | Pending |
| DATA-04 | Phase 5 | Pending |
| DATA-05 | Phase 5 | Pending |
| DATA-06 | Phase 5 | Pending |
| DATA-07 | Phase 5 | Pending |
| STAGE-01 | Phase 6 | Pending |
| STAGE-02 | Phase 6 | Pending |
| STAGE-03 | Phase 6 | Pending |
| STAGE-04 | Phase 6 | Pending |
| STAGE-05 | Phase 6 | Pending |
| STAGE-06 | Phase 6 | Pending |
| STAGE-07 | Phase 6 | Pending |
| TEST-07 | Phase 6 | Pending |
| UI-01 | Phase 7 | Pending |
| UI-02 | Phase 7 | Pending |
| UI-03 | Phase 7 | Pending |
| UI-04 | Phase 7 | Pending |
| UI-05 | Phase 7 | Pending |
| UI-06 | Phase 7 | Pending |
| UI-07 | Phase 7 | Pending |
| OPS-01 | Phase 8 | Pending |
| OPS-02 | Phase 8 | Pending |
| OPS-03 | Phase 8 | Pending |
| OPS-04 | Phase 8 | Pending |
| OPS-05 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 66 total
- Mapped to phases: 66
- Unmapped: 0

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after Phase 3 verification*
