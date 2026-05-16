# Zoom Session Revocation Design

Date: 2026-05-16
Status: Approved design

## Problem

When a learner joins a Zoom meeting on iPhone Safari, then signs in on Windows Chrome and joins the same meeting, the iPhone meeting can continue even though its app session has been revoked. The current same-device enforcement removes old Prisma `Session` rows, but it does not always set the Redis revocation marker or broadcast the SSE revocation event that the already-open browser tab needs.

## Goals

- Kick the older device out of the app and active Zoom iframe as soon as another device takes over the account.
- Preserve the current authenticated `/meeting` iframe flow and server-owned Zoom signature route.
- Keep enforcement best-effort and staging-suitable without introducing Zoom host-control or participant-expel API dependencies.
- Add focused automated coverage around the session revoke path and static Zoom iframe leave contract.

## Requirement Mapping

- `ZOOM-01`: Preserve and document the current authenticated meeting flow.
- `ZOOM-03`: Keep Zoom signatures server-side and avoid exposing SDK secrets.
- `ZOOM-06`: Preserve meeting launch behavior through smokeable checks.
- `TEST-04`: Cover Zoom meeting access checks through automated or documented smoke tests.
- `OPS-03`: Treat client controls as a cleanup/deterrence layer, not the only enforcement boundary.

## Approved Approach

Use immediate best-effort session revocation:

1. The new device registers its fingerprint.
2. The server revokes older sessions through the shared `revokeSession()` helper.
3. Redis stores `session_revoked:<token>` and invalidates `session_valid:<token>`.
4. Active tabs receive the existing SSE `revoked` event when possible.
5. The client dispatches a local revocation event before sign-out.
6. `/meeting` sends a same-origin message into `public/zoom-meeting.html`.
7. The iframe calls `ZoomMtg.leaveMeeting({ confirm: false })`, then normal redirect/sign-out proceeds.
8. Meeting pages use a shorter validation fallback so iOS/Safari suspension does not leave the old meeting running for minutes.

## Components

### `src/app/api/session/fingerprint/route.ts`

Replace the auto-revoke path that directly deletes old DB sessions and only invalidates cache. For every older session with a different fingerprint and a session token, call:

```ts
await revokeSession(sessionToken, 'Signed in on another device');
```

After revocation markers are set, delete the old session rows and optionally persist the existing revoked-session audit record if local patterns support it.

The `PATCH` activity handler should identify the current session by the request cookie token instead of updating the latest fingerprinted session for the user. That prevents activity from the wrong browser extending or mutating another device's metadata.

### `src/app/api/session/validate/route.ts`

Check `isSessionRevoked(sessionToken)` before returning any cached `session_valid:<token>` result. A revoked token must never validate from a stale success cache.

### `src/app/api/session/events/route.ts`

Keep in-memory SSE broadcast as the fast path. Add Redis revocation checks during keepalive so cross-instance or delayed revocation is detected even when the event was not broadcast on the same server instance.

### `src/hooks/useSessionSSE.ts`

Before `signOut({ redirect: false })`, dispatch a browser event:

```ts
window.dispatchEvent(new CustomEvent('session:revoked', { detail: { reason } }));
```

This keeps revocation handling centralized while allowing active pages to clean up embedded tools before the app redirects.

Also expose or support a shorter fallback polling interval for meeting pages. Default app polling can remain conservative, but `/meeting` should validate about every 10-15 seconds while the iframe is active.

### `src/app/meeting/page.tsx`

Hold an iframe ref. Listen for `session:revoked`. When received, send a same-origin `postMessage` to the iframe:

```ts
iframeRef.current?.contentWindow?.postMessage(
  { type: 'platform:leave-meeting', reason },
  window.location.origin
);
```

The parent page should still rely on the global sign-out redirect as the final transition. The iframe message is cleanup for the active Zoom session, not the security boundary.

### `public/zoom-meeting.html`

Add a same-origin `message` listener. When `type === 'platform:leave-meeting'`, call Zoom's Client View API:

```js
ZoomMtg.leaveMeeting({
  confirm: false,
  success: function () {
    window.parent.location.href = '/auth/signin?error=SessionRevoked';
  },
  error: function () {
    window.parent.location.href = '/auth/signin?error=SessionRevoked';
  }
});
```

The listener must ignore cross-origin messages and malformed payloads.

Zoom's current Meeting SDK docs define `ZoomMtg.leaveMeeting({ confirm, success, error })` for Client View:
https://marketplacefront.zoom.us/sdk/meeting/web/functions/ZoomMtg.leaveMeeting.html

Zoom's Client View docs also require `leaveUrl`, which remains configured as the fallback redirect:
https://marketplacefront.zoom.us/sdk/meeting/web/index.html

## Data Flow

```text
Chrome login/fingerprint
  -> POST /api/session/fingerprint
  -> find older same-user different-fingerprint sessions
  -> revokeSession(oldToken)
  -> Redis session_revoked + cache invalidation + SSE broadcast
  -> iPhone EventSource receives revoked, or fallback validation detects revoked
  -> useSessionSSE dispatches session:revoked
  -> meeting page posts platform:leave-meeting to iframe
  -> zoom-meeting.html calls ZoomMtg.leaveMeeting({ confirm: false })
  -> parent redirects to /auth/signin?error=SessionRevoked
```

## Error Handling

- Redis unavailable: do not claim instant kick. DB session deletion still blocks future authenticated requests, but active tabs may not receive immediate push. Log a redacted warning.
- SSE disconnected: reconnect as today, then use shorter meeting fallback polling.
- Iframe not ready: parent still signs out and redirects, unloading the iframe.
- Zoom `leaveMeeting` fails: redirect parent anyway, because app session enforcement is server-owned.
- Cross-origin message: iframe ignores it.
- Duplicate revocation events: handler should be idempotent and redirect at most once.

## Testing

Add focused tests where repo patterns allow:

- API route test for `POST /api/session/fingerprint`: different-fingerprint old sessions call `revokeSession()` with old token and delete the old DB row.
- API route test for `GET /api/session/validate`: revoked token returns invalid even when `session_valid:<token>` cache says true.
- Unit or static contract test for `public/zoom-meeting.html`: contains a same-origin `platform:leave-meeting` listener and calls `ZoomMtg.leaveMeeting` with `confirm: false`.
- Hook/page test if feasible: `useSessionSSE` dispatches `session:revoked` before calling `signOut`, and meeting page sends the leave message to iframe.
- Manual UAT: iPhone Safari joins meeting, Windows Chrome signs in and joins, iPhone leaves or redirects within the target window. Record observed delay and browser console output.

## Non-Goals

- Do not replace Zoom with another provider.
- Do not add Zoom host participant-expel APIs in this patch.
- Do not redesign the meeting UI.
- Do not change Zoom signature role rules.
- Do not treat client-side iframe cleanup as the only security boundary.

## Success Criteria

- Auto device revocation uses the same Redis/SSE contract as admin revocation.
- Revoked tokens cannot validate from stale cache.
- Active meeting pages attempt to leave Zoom before redirecting.
- iPhone Safari receives revocation by SSE or meeting fallback validation within about 15 seconds in normal staging conditions.
- Tests cover the server revoke path and Zoom leave message contract.
