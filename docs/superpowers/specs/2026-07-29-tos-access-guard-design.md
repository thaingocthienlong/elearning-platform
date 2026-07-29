# 24-Hour TOS Access Guard Design

**Status:** Approved in conversation
**Date:** 2026-07-29
**Scope:** New Phase 10 security-sensitive access control

## Context

The app currently has two incomplete pieces of this behavior:

- `src/components/course/IPRConsentOverlay.tsx` displays a one-click intellectual-property warning only inside the video player.
- `src/components/course/WatchPageClient.tsx` stores that acceptance in component state, so it resets on every page load and does not protect course or meeting access.

The existing `src/proxy.ts` performs coarse session checks for `/meeting`, while `/courses` pages perform their own server-session checks. The Zoom signature and DRM token routes authenticate users but do not require Terms of Service acceptance.

The new guard must prevent protected page rendering and sensitive token issuance until the current authenticated browser session has explicitly accepted the current TOS version. Acceptance lasts no longer than 24 hours.

## Goals

- Require users to view the complete TOS, scroll to its end, tick an explicit confirmation checkbox, and click Agree.
- Protect `/courses/**`, `/watch/**`, and `/meeting/**`.
- Protect DRM-token and Zoom-signature issuance against direct API calls.
- Cache acceptance for exactly 24 hours in the current browser and current authenticated session.
- Invalidate acceptance after logout, account change, session-token change, TOS-version change, expiry, or cookie tampering.
- Preserve current session revocation, system-mode, course entitlement, DRM, and Zoom behavior.
- Reuse existing UI primitives and platform APIs; add no database model, Redis key, package, or external service.

## Non-Goals

- Cross-device or cross-browser acceptance.
- A permanent legal-audit record or admin acceptance history.
- Proving that a user understood the text. The product can prove only that the complete text was displayed, scrolled, and explicitly accepted.
- Changing course enrollment, media entitlement, view limits, Zoom roles, or DRM rules.
- Guarding `/admin` unless an administrator visits one of the protected learner routes.
- Replacing authentication or session revocation.

## Requirement IDs

- **TOS-01:** A protected page cannot render until the authenticated user scrolls through the current TOS, checks the confirmation, and agrees.
- **TOS-02:** Acceptance is stored in a signed, session-bound, HttpOnly cookie with a hard 24-hour lifetime.
- **TOS-03:** `/courses/**`, `/watch/**`, and `/meeting/**` reject missing, expired, mismatched, or tampered acceptance.
- **TOS-04:** DRM-token and Zoom-signature issuance independently reject requests without valid acceptance.
- **TOS-05:** The consent dialog is accessible, cannot be dismissed into protected content, supports explicit refusal, and reports submission errors without granting access.
- **TOS-06:** Unit, route, proxy, component, build, security-scan, and browser-smoke verification cover allow and deny paths.

## Approaches Considered

### 1. Signed, session-bound HttpOnly cookie

Use an HMAC-signed cookie containing only a TOS version, server expiry, and hash of the current NextAuth session token. Verify it in Proxy and again near sensitive data or token issuance.

**Selected.** This matches the browser-and-session scope, works across Vercel instances, needs no datastore, and provides a hard 24-hour expiry.

### 2. Redis or database acceptance record

Store acceptance by user ID with a 24-hour TTL or timestamp.

Rejected for this requirement. It creates cross-device behavior, adds a network dependency and cleanup/audit semantics, and conflicts with the approved browser-and-session scope.

### 3. Client `localStorage`

Store an expiry and display a client-only modal.

Rejected. Users can forge the value, protected Server Components may execute before the modal appears, and direct API requests can bypass it.

## Architecture

### Shared token helper

Create `src/lib/tos-access.ts` with an Edge-compatible, dependency-free contract:

```ts
export const TOS_COOKIE_NAME = 'tos_access';
export const TOS_VERSION = '2026-07-29';
export const TOS_TTL_SECONDS = 86_400;

export type TosAccessPayload = {
  version: string;
  expiresAt: number;
  sessionHash: string;
};

export async function createTosAccessToken(
  sessionToken: string,
  secret: string,
  nowMs?: number,
): Promise<string>;

export async function verifyTosAccessToken(
  token: string | undefined,
  sessionToken: string | undefined,
  secret: string | undefined,
  nowMs?: number,
): Promise<boolean>;
```

Implementation uses native Web Crypto:

- SHA-256 hashes the current raw NextAuth session token.
- HMAC-SHA256 signs a base64url payload with `NEXTAUTH_SECRET`.
- A domain prefix such as `tos-access-v1:` separates this signature from other uses of the same secret.
- Verification checks the HMAC, current `TOS_VERSION`, server time, and current session-token hash.
- The helper never logs or returns the raw session token or secret.

The cookie value is:

```text
base64url(payload).base64url(hmac)
```

### Cookie contract

The acceptance route sets:

```text
Name: tos_access
HttpOnly: true
SameSite: Lax
Path: /
Max-Age: 86400
Expires: server time + 24 hours
Secure: true in production
```

No `Domain` attribute is set. Both cookie expiry and signed payload expiry are enforced. The earlier expiry wins.

### Acceptance route

Create `POST /api/tos/accept`.

The route:

1. Requires a valid NextAuth database session.
2. Reads the current raw session cookie using the existing development and secure-production cookie names.
3. Accepts only same-origin JSON matching:

```ts
{
  accepted: true;
  version: '2026-07-29';
}
```

4. Rejects a stale client version.
5. Creates the signed token and sets the cookie.
6. Returns `{ accepted: true, expiresAt }` with `Cache-Control: no-store`.

The client enforces scrolling. The server treats the authenticated explicit acceptance POST as the durable evidence available in this browser-only design.

### Proxy gate

Extend `src/proxy.ts` with explicit protected page prefixes:

```text
/courses
/watch
/meeting
```

Processing order remains:

1. System-mode rules.
2. Existing rate limits.
3. Existing session-cookie and revocation checks.
4. TOS verification.
5. Protected application route.

For a protected page without valid TOS acceptance, Proxy rewrites internally to `/tos-approval`. The browser retains the originally requested URL, and the target page is not returned to the user.

The following routes bypass the TOS gate to avoid loops:

```text
/tos-approval
/api/tos/accept
/api/auth/**
/_next/**
```

Proxy is an early gate, not the only authorization boundary.

### Server-side defense in depth

Add a small server-cookie adapter around the shared verifier. Call it before protected data or credentials are produced:

- `src/app/courses/page.tsx`, before course queries.
- `src/app/courses/[courseId]/page.tsx`, before course-detail queries.
- `src/app/watch/[videoId]/page.tsx`, before entitlement queries and Tencent token generation.
- `src/app/api/drm/token/route.ts`, after authentication and before DRM-token issuance.
- `src/app/api/zoom/signature/route.ts`, after authentication and before Zoom-signature generation.

Missing or invalid TOS acceptance causes:

- a rewrite or redirect to the consent surface for page requests;
- HTTP `403` with `{ code: 'TOS_ACCEPTANCE_REQUIRED' }` for protected APIs.

Course prefetch APIs and heartbeat/security telemetry are not additional access-grant boundaries and remain unchanged.

### Consent surface

Create:

- `src/app/tos-approval/page.tsx`
- `src/components/tos/TosConsentDialog.tsx`

Reuse the existing `Button`, `Checkbox`, `Dialog`, and `ScrollArea` primitives plus the shield visual language from `IPRConsentOverlay`.

The consent page renders only the dialog. Protected course, watch, or meeting content is not placed behind a cosmetic overlay.

After successful acceptance, the client reloads the browser's current URL. Proxy then verifies the new cookie and serves the original protected route.

### Existing IPR overlay

The new TOS includes the current intellectual-property warning and covers `/watch/**`. Remove the local `isIPRAccepted` state and embedded `IPRConsentOverlay` branch from `WatchPageClient`.

Delete `IPRConsentOverlay.tsx` after its relevant visual treatment and copy have moved to the new dialog. This avoids asking the same user to agree twice.

## User Experience

The dialog is open by default and cannot be closed by:

- clicking outside;
- pressing Escape;
- a close icon.

It provides an explicit **Decline** action that returns to `/` without setting acceptance. Browser Back also remains available. The user is never forced to accept, but cannot enter protected content without accepting.

Initial state:

- TOS content is visible in a labelled scroll region.
- Confirmation checkbox is disabled.
- Agree button is disabled.
- Instruction says to scroll to the end.

When the scroll viewport reaches the end within a small pixel tolerance, the checkbox becomes enabled. If all content already fits in the viewport, the checkbox becomes enabled after layout measurement because the complete text is visible.

After the user checks the confirmation, Agree becomes enabled. Submission displays a loading state and prevents duplicate requests.

On success, the original protected URL reloads. On failure, the dialog remains open, grants nothing, shows a generic actionable error, and permits retry.

## TOS Content Contract

The app remains bilingual and stores the content beside the existing translation system. Both languages contain the same five sections:

1. **Personal access:** The account, session, protected links, and course access are for the registered user only and must not be shared.
2. **Intellectual property:** Course and meeting materials may not be copied, downloaded, recorded, captured, redistributed, streamed, or published without written authorization.
3. **Course and meeting conduct:** Users must not disrupt teaching, impersonate another person, or make unauthorized recordings of classes or meetings.
4. **Security notice:** Protected content may include visible or invisible account-linked watermarks, and access/security events may be logged to detect misuse.
5. **Acceptance lifetime:** Acceptance applies only to the current browser and authenticated session for up to 24 hours. Logout, account change, expiry, or a new TOS version requires acceptance again.

Required Vietnamese confirmation:

> Tôi xác nhận đã cuộn đọc toàn bộ nội dung trên và đồng ý tuân thủ các điều khoản này.

Required English confirmation:

> I confirm that I have scrolled through and read the complete terms above, and I agree to follow them.

Primary action labels are **Đồng ý và tiếp tục** / **Agree and continue**. Refusal labels are **Không đồng ý** / **Decline**.

This is product access copy, not a claim of legal review. Legal counsel can revise the wording later without changing the technical design; any material revision must increment `TOS_VERSION`.

## Error Handling

| Condition | Result |
| --- | --- |
| No authenticated session | Existing sign-in redirect or API `401` |
| Missing acceptance cookie | Consent surface or API `403` |
| Expired payload/cookie | Consent surface or API `403` |
| Wrong TOS version | Consent surface or API `403` |
| Different session-token hash | Consent surface or API `403` |
| Malformed or tampered cookie | Clear cookie, then show consent surface or API `403` |
| Missing signing secret | Fail closed; generic configuration error; no acceptance |
| Acceptance POST body/version invalid | API `400`; no cookie |
| Acceptance POST signing failure | API `500`; generic error; no cookie |
| Consent network failure | Keep dialog open and allow retry |

No error response includes secret values, session tokens, cookie contents, email addresses, DRM tokens, or Zoom credentials.

## Security Properties and Limits

- A user cannot create or extend acceptance without the signing secret.
- Copying only the acceptance cookie to another browser session fails because the session hash differs.
- Stealing both the authenticated session cookie and acceptance cookie is session theft and remains governed by the existing session-revocation controls.
- Client-side scrolling can be automated by a determined user. It is an interaction requirement, not a hard security boundary.
- Proxy prevents normal early access; page and route checks prevent Proxy matcher drift from becoming a token/data bypass.
- The design creates no permanent acceptance audit. Add a database audit event only if a later legal or compliance requirement explicitly needs it.

## Verification

### Unit tests

Create `__tests__/lib/tos-access.test.ts` covering:

- valid token;
- exact 24-hour boundary;
- expired token;
- tampered payload;
- tampered signature;
- wrong version;
- different session;
- missing token/session/secret;
- absence of raw session token and PII in the encoded payload.

### Acceptance-route tests

Create `__tests__/api/tos-accept.test.ts` covering:

- unauthenticated `401`;
- invalid JSON/body/version `400`;
- missing session cookie;
- missing secret fail-closed behavior;
- successful cookie value, flags, and 86,400-second lifetime;
- no sensitive values in response or logs.

### Proxy tests

Create `__tests__/proxy-tos.test.ts` covering:

- missing/invalid acceptance on each protected prefix;
- valid acceptance pass-through;
- consent/auth/static bypasses;
- invalid cookie clearing;
- system-mode behavior preceding TOS behavior;
- protected API `403` behavior without HTML rewrites.

### Component tests

Create `__tests__/components/tos-consent-dialog.test.tsx` covering:

- disabled checkbox before end-of-scroll;
- non-overflowing content;
- enabled checkbox after end-of-scroll;
- disabled Agree before confirmation;
- outside-click and Escape cannot expose protected content;
- explicit decline;
- loading and duplicate-submit prevention;
- success reload;
- error display and retry;
- keyboard navigation and accessible labels.

### Existing tests to extend

- `__tests__/api/zoom-signature.test.ts`: deny before TOS and preserve current signature behavior after TOS.
- Existing DRM/media route tests: deny token issuance before TOS and preserve entitlement behavior after TOS.
- Watch-page tests: no Tencent playback token generation before TOS.

### Quality gates

Run in order:

```text
targeted Jest tests
full Jest suite
npm run lint
npm run typecheck
npm run build
npm run secrets:scan
```

Browser-visible smoke checks verify:

- first protected visit shows consent;
- scrolling and checkbox gating;
- refresh/navigation within 24 hours skips consent;
- direct `/watch/...` cannot bypass consent;
- logout/login requires consent again;
- deletion, expiry, corruption, and version mismatch require consent again;
- direct DRM and Zoom calls fail before acceptance and succeed only after normal authorization plus acceptance;
- mobile sizing, keyboard navigation, focus behavior, and bilingual copy.

## Rollout and Rollback

This design has no schema migration, data backfill, Redis key, or external-service change.

Rollout requires `NEXTAUTH_SECRET` to remain configured in every deployed environment. Deploy to staging, run the browser smoke matrix, then release normally.

Rollback removes the Proxy TOS branch, server-side TOS checks, acceptance route/surface, and cookie helper. Deleting the client cookie is optional because an unused HttpOnly cookie has no effect and expires within 24 hours.

## Planning Integration

Treat this work as **Phase 10: 24-Hour TOS Access Guard** after the completed Tencent migration. Add TOS-01 through TOS-06 to `.planning/REQUIREMENTS.md`, map them once in `.planning/ROADMAP.md`, update `.planning/PROJECT.md` and `.planning/STATE.md`, and keep the planning commit separate from source changes.
