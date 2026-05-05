# Secret Hygiene

This guide documents how maintainers handle inherited environment files, DRM keys, certificates, service-account files, media artifacts, and scanner findings during Phase 1.

Do not read, print, copy, move, delete, or commit secret values from env files, key files, DRM artifacts, service account files, certificates, or media keys.

## Phase 1 Boundary

Phase 1 inventories and scans only. It does not remediate inherited artifacts, remove files, rewrite git history, rotate credentials, or decide which keys are still live. Rotation and removal review must happen later as an explicit security decision with the service owner present.

## Artifact Categories

Sensitive-looking workspace artifacts include:

- Env files such as `.env.local`, `packager.env`, and `mosaic-service-account-config*.env`.
- DRM key material such as `keys.json`, `KIDs.json`, `*.hex`, `*.cpix.xml`, and `wv_pssh.hex`.
- Certificates and private keys such as `*.pem`, `*.der.b64`, and `localhost.key`.
- Service account material such as `mosaic-service-account-config*.env`.
- Media artifacts such as `*.mp4`, `*.mkv`, `*.mov`, and `*.avi`.
- Database drift or dump artifacts such as `drift.sql` and `source_dump.txt`.

## Placeholder-Only Examples

Documentation and examples must use placeholders only:

```text
DATABASE_URL=mongodb://localhost:27017/secure_video_platform
NEXTAUTH_SECRET=replace-with-local-secret
AXINOM_COM_KEY_SECRET=replace-with-axinom-secret
ZOOM_MEETING_SDK_SECRET=replace-with-zoom-secret
```

Do not promote inherited local values into `.env.example`, docs, tests, screenshots, issue reports, or chat logs. `docs/env-matrix.md` is the source of truth for variable ownership, sensitivity, and local/staging need.

## Path-Only Inventory

Run:

```bash
npm run secrets:inventory
```

The inventory reports paths, risk categories, git tracking state, git-ignore state, file size, and recommended review action. It uses file metadata only and must not print file contents or secret values.

Expected output shape:

```text
path/to/file.env | category=env-file | trackedByGit=false | ignoredByGit=true | sizeBytes=123 | action=keep-ignored
```

If an item is `trackedByGit=true`, treat it as a rotation/removal review candidate. Do not delete it in Phase 1.

## Redacted Secret Scan

Run:

```bash
npm run secrets:scan
```

When `gitleaks` is installed, this command runs a redacted workspace scan:

```bash
gitleaks detect --source . --redact --no-banner
```

Local default behavior is maintainer-friendly: if `gitleaks` is missing, the command prints installation guidance and exits 0. Strict mode and CI require the scanner:

```bash
npm run secrets:scan -- --strict
```

Scanner findings are review input, not automatic remediation. Keep scanner output redacted before sharing logs or attaching results to tickets.

## Later Rotation and Removal Review

Before staging, the maintainer should review inventoried paths with the relevant service owner and decide:

- Whether the file ever contained a real secret.
- Whether the secret was committed to git history.
- Whether the corresponding service credential or DRM key must be rotated.
- Whether the artifact should be removed, replaced with a placeholder `.example`, or retained outside the repo.

Document those decisions in the owning later security or staging plan. Phase 1 intentionally stops at path-only inventory, redacted scanning, and setup guidance.
