# Production Hardening Backlog

This backlog satisfies OPS-05. It captures remaining production-hardening work after staging readiness. It is not a production launch certificate.

Priority scale:

- P0: Blocks safe production launch or can expose secrets/access.
- P1: Important reliability, audit, or maintainability risk.
- P2: Useful hardening after production-critical risks are addressed.

## P0 - Production Blockers

| ID | Area | Item | Why It Matters | Exit Criteria |
|----|------|------|----------------|---------------|
| HARDEN-P0-01 | Secrets | Install gitleaks in CI and require strict secret scans. | Current local `secrets:scan` skips gitleaks when unavailable. | CI fails on secret findings with redaction enabled. |
| HARDEN-P0-02 | Credentials | Rotate any inherited credentials or keys that were ever committed or shared outside secret storage. | Workspace contains inherited secret-like artifacts; exposure history must be settled before production. | Rotation record exists outside repo; old values disabled. |
| HARDEN-P0-03 | Video processing | Move long-running video processing orchestration away from HTTP request duration limits. | Vercel functions can time out; encoding control needs durable orchestration. | Queue/worker/provider-native job path exists with retry and status tracking. |
| HARDEN-P0-04 | Backups | Define and test MongoDB backup/restore plus media metadata recovery. | Production data loss cannot be handled by staging docs. | Restore drill completed against non-production data. |
| HARDEN-P0-05 | Incident response | Create production incident response, escalation, and credential rotation procedures. | Maintainers need a concrete response path for access, DRM, auth, and playback incidents. | Runbook approved by owner and linked from operations docs. |

## P1 - High-Value Hardening

| ID | Area | Item | Why It Matters | Exit Criteria |
|----|------|------|----------------|---------------|
| HARDEN-P1-01 | Admin | Replace generic dynamic admin mutations with typed registries and per-model allowlists. | Dynamic `any`/`@ts-ignore` admin routes can fail or mutate unintended fields. | Typed registry tests cover create/update/delete per supported table. |
| HARDEN-P1-02 | Session lifecycle | Make SSE/session revocation multi-instance aware through Redis pub/sub or polling. | Current process-local broadcast does not reach every serverless instance. | Revocation smoke passes across multiple instances. |
| HARDEN-P1-03 | Observability | Add structured server logging with redaction and request correlation IDs. | Raw console logs are hard to audit and can leak sensitive context. | Logs contain correlation IDs and pass redaction tests. |
| HARDEN-P1-04 | Security events | Add retention/export policy for security events. | High-volume client telemetry can grow unbounded. | Retention job or archival policy exists and is documented. |
| HARDEN-P1-05 | UI screenshots | Install Playwright or equivalent and automate primary screenshot capture. | Phase 7 screenshot checklist exists but automation is not installed. | Screenshot command captures primary desktop/mobile surfaces. |
| HARDEN-P1-06 | Load testing | Add staging load tests for watch, admin, support, and Zoom launch paths. | Production concurrency behavior is not certified by unit/build tests. | Load report defines limits and bottlenecks. |

## P2 - Follow-Up Improvements

| ID | Area | Item | Why It Matters | Exit Criteria |
|----|------|------|----------------|---------------|
| HARDEN-P2-01 | Database | Revisit database migration only if profiling shows MongoDB cannot meet requirements. | Avoid high-risk migration without evidence. | Profiling report supports keep/migrate decision. |
| HARDEN-P2-02 | Admin UI | Apply deeper academic/operational redesign to dense admin pages. | Phase 7 preserved admin density but did not deeply redesign every admin workflow. | Admin screenshots and usability review pass. |
| HARDEN-P2-03 | Vendor upgrades | Schedule quarterly Axinom, Zoom, Next.js, Prisma, Shaka, and Vercel review. | Vendor SDKs and hosting behavior change over time. | Upgrade review issue created each quarter. |
| HARDEN-P2-04 | Compliance | Define institute-specific compliance needs if applicable. | Legal/regulatory controls depend on the real operating context. | Compliance owner signs off or marks not applicable. |
| HARDEN-P2-05 | Analytics | Add richer export/reporting after dashboard performance is stable. | Useful for academic operations, but not staging-critical. | Export requirements and privacy rules are approved. |
