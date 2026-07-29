# 24-Hour TOS Access Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require authenticated learners to read and accept the current Terms of Service before protected course, playback, or meeting access, with acceptance bound to the current NextAuth browser session for no more than 24 hours.

**Architecture:** A dependency-free Web Crypto helper signs a versioned, expiring, session-bound HttpOnly cookie. `src/proxy.ts` provides the early page/API gate, while Server Components and sensitive token routes verify acceptance again before reading protected data or minting Tencent/Zoom credentials. A non-dismissible bilingual Radix dialog enforces scroll-to-end, checkbox confirmation, and explicit acceptance.

**Tech Stack:** Next.js 16.2 App Router and `proxy.ts`, NextAuth 4 database sessions, React 18, TypeScript 5, native Web Crypto, Radix/shadcn UI primitives, Jest 30, Testing Library.

## Global Constraints

- Implement requirement IDs `TOS-01` through `TOS-06`.
- Use `TOS_VERSION = '2026-07-29'`.
- Use `TOS_TTL_SECONDS = 86_400`; acceptance is invalid at `expiresAt` and later.
- Protect `/courses/**`, `/watch/**`, and `/meeting/**`.
- Protect `/api/drm/token` and `/api/zoom/signature` independently.
- Bind acceptance to `next-auth.session-token` or `__Secure-next-auth.session-token`.
- Store acceptance only in `tos_access`, signed with `NEXTAUTH_SECRET`.
- Set `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=86400`, matching `Expires`, and `Secure` in production.
- Missing, expired, wrong-version, wrong-session, malformed, or tampered acceptance fails closed.
- Page denial shows `/tos-approval`; authenticated API denial returns HTTP `403` with `{ code: 'TOS_ACCEPTANCE_REQUIRED' }`.
- Keep system-mode handling, session revocation, enrollment, view-limit, Tencent DRM, and Zoom authorization behavior.
- Add no database model, Redis key, migration, npm dependency, or external service.
- Never log or return raw session tokens, cookie contents, secrets, emails, DRM tokens, or Zoom credentials from TOS failures.
- Keep scroll enforcement as an interaction gate, not a legal claim that the user understood the text.
- Remove the redundant player-only `IPRConsentOverlay` after the new guard covers `/watch/**`.
- Preserve these confirmation strings verbatim:
  - Vietnamese: `Tôi xác nhận đã cuộn đọc toàn bộ nội dung trên và đồng ý tuân thủ các điều khoản này.`
  - English: `I confirm that I have scrolled through and read the complete terms above, and I agree to follow them.`
- Keep GSD planning-only commits separate from source-code commits.
- Preserve existing untracked `.agents/` and `codex-plugins/`; never stage them.

---

## File Map

| Path | Action | Responsibility |
| --- | --- | --- |
| `.planning/PROJECT.md` | Modify | Register approved Phase 10 scope and architecture decision. |
| `.planning/STATE.md` | Modify twice | Mark Phase 10 active before code, then complete only after all gates pass. |
| `.planning/ROADMAP.md` | Modify twice | Add Phase 10, map requirements, then close its plan. |
| `.planning/REQUIREMENTS.md` | Modify twice | Add `TOS-01`–`TOS-06`, then mark them complete after verification. |
| `src/lib/tos-access.ts` | Create | Edge-compatible cookie token constants, session-cookie reader, signing, and verification. |
| `src/lib/tos-access-server.ts` | Create | Read Server Component cookies, enforce page acceptance, and build API denial responses. |
| `src/app/api/tos/accept/route.ts` | Create | Validate same-origin explicit acceptance and set the 24-hour cookie. |
| `src/proxy.ts` | Modify | Early session/TOS gate, internal page rewrite, API `403`, invalid-cookie clearing. |
| `src/app/courses/page.tsx` | Modify | Require TOS before learner/course queries. |
| `src/app/courses/[courseId]/page.tsx` | Modify | Require authentication and TOS before course-detail queries. |
| `src/app/watch/[videoId]/page.tsx` | Modify | Require TOS before entitlement queries and playback-token creation. |
| `src/app/api/drm/token/route.ts` | Modify | Deny authenticated requests without TOS before entitlement/token generation. |
| `src/app/api/zoom/signature/route.ts` | Modify | Deny authenticated requests without TOS before config/database/signature work. |
| `src/app/tos-approval/page.tsx` | Create | Render only the consent surface for Proxy rewrites. |
| `src/components/tos/TosConsentDialog.tsx` | Create | Accessible scroll, checkbox, decline, submit, retry, and reload interaction. |
| `src/lib/translations.ts` | Modify | Store equivalent English and Vietnamese TOS copy. |
| `src/components/course/WatchPageClient.tsx` | Modify | Render player directly after server/proxy acceptance; remove local IPR state. |
| `src/components/course/IPRConsentOverlay.tsx` | Delete | Remove duplicate one-click consent. |
| `__tests__/lib/tos-access.test.ts` | Create | Verify signing, expiry, version, session binding, tamper rejection, and payload privacy. |
| `__tests__/api/tos-accept.test.ts` | Create | Verify route trust boundary and cookie contract. |
| `__tests__/proxy-tos.test.ts` | Create | Verify route classification, ordering, rewrite, API denial, bypass, and clearing. |
| `__tests__/app/tos-protected-pages.test.tsx` | Create | Prove protected data/token work never starts before TOS. |
| `__tests__/components/tos-consent-dialog.test.tsx` | Create | Verify accessible interaction, scroll gating, refusal, submission, and retry. |
| `__tests__/api/media-routes.test.ts` | Modify | Add DRM-token TOS deny path and preserve existing entitlement allow path. |
| `__tests__/api/zoom-signature.test.ts` | Modify | Add Zoom-signature TOS deny path and preserve existing behavior after TOS. |

### Shared interfaces locked by this plan

```ts
export const TOS_COOKIE_NAME = 'tos_access';
export const TOS_REQUIRED_CODE = 'TOS_ACCEPTANCE_REQUIRED';
export const TOS_VERSION = '2026-07-29';
export const TOS_TTL_SECONDS = 86_400;

export type TosAccessPayload = {
  version: string;
  expiresAt: number;
  sessionHash: string;
};

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function readSessionToken(cookieStore: CookieReader): string | undefined;

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

export async function hasTosAccess(): Promise<boolean>;
export async function requireTosAccess(): Promise<void>;
export function tosAcceptanceRequiredResponse(): NextResponse;
```

---

### Task 1: Register Phase 10 in GSD

**Files:**
- Modify: `.planning/PROJECT.md`
- Modify: `.planning/STATE.md`
- Modify: `.planning/ROADMAP.md`
- Modify: `.planning/REQUIREMENTS.md`

**Interfaces:**
- Consumes: Approved design at `docs/superpowers/specs/2026-07-29-tos-access-guard-design.md`.
- Produces: Pending `TOS-01`–`TOS-06`, one Phase 10 roadmap mapping, and active resume state.

- [ ] **Step 1: Add the six pending requirements**

Add this section immediately after the Tencent migration requirements in `.planning/REQUIREMENTS.md`:

```markdown
## Phase 10 Requirements

### 24-Hour TOS Access Guard

- [ ] **TOS-01**: A protected page cannot render until the authenticated user scrolls through the current TOS, checks the confirmation, and agrees.
- [ ] **TOS-02**: Acceptance is stored in a signed, session-bound, HttpOnly cookie with a hard 24-hour lifetime.
- [ ] **TOS-03**: `/courses/**`, `/watch/**`, and `/meeting/**` reject missing, expired, mismatched, or tampered acceptance.
- [ ] **TOS-04**: DRM-token and Zoom-signature issuance independently reject requests without valid acceptance.
- [ ] **TOS-05**: The consent dialog is accessible, cannot be dismissed into protected content, supports explicit refusal, and reports submission errors without granting access.
- [ ] **TOS-06**: Unit, route, proxy, component, build, security-scan, and browser-smoke verification cover allow and deny paths.
```

Add `TENCENT-01`–`TENCENT-09` as complete and `TOS-01`–`TOS-06` as pending to the traceability table. Replace the coverage summary with:

```markdown
**Coverage:**
- Active milestone requirements: 81 total
- Complete: 75
- Pending: 6
- Mapped to phases: 81
- Unmapped: 0
```

- [ ] **Step 2: Add Phase 10 to the roadmap**

Append before `## Progress`:

```markdown
### Phase 10: 24-Hour TOS Access Guard
**Goal**: Authenticated learners must explicitly read and accept the current TOS before course, playback, or meeting access.
**Depends on**: Phase 9
**Requirements**: TOS-01, TOS-02, TOS-03, TOS-04, TOS-05, TOS-06
**Success Criteria** (what must be TRUE):
  1. Protected learner pages cannot render before valid session-bound acceptance.
  2. Acceptance expires within 24 hours and fails after session, version, expiry, or signature mismatch.
  3. Direct Tencent DRM-token and Zoom-signature calls fail before acceptance.
  4. The bilingual consent UI requires end-of-scroll plus explicit confirmation and remains accessible.
  5. Targeted tests, full quality gates, secret scan, and browser smoke pass.
**Plans**: 1 plan
Plans:
- [ ] `docs/superpowers/plans/2026-07-29-tos-access-guard.md` - Signed TOS access guard, consent UI, and verification.
```

Change execution order to `1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10`, add a `0/1 | In Progress | -` Phase 10 row, add all six TOS mappings to Coverage, and replace the final validation line with:

```markdown
**Coverage validated:** 81/81 active milestone requirements mapped exactly once; 75 complete and 6 pending.
```

- [ ] **Step 3: Mark Phase 10 active in project/state**

Add this Active requirement to `.planning/PROJECT.md`:

```markdown
- [ ] Require authenticated learners to accept the current TOS before course, playback, or meeting access, using a signed session-bound browser cookie that expires within 24 hours.
```

Add this Key Decision row:

```markdown
| Use a signed session-bound HttpOnly cookie for TOS acceptance | Browser-and-session scope needs no database, Redis key, or cross-device history; native Web Crypto supplies tamper resistance. | Accepted for Phase 10 |
```

Update `.planning/STATE.md` to:

```markdown
**Current focus:** Phase 10 - 24-Hour TOS Access Guard

## Current Position

Phase: 10 of 10 (24-Hour TOS Access Guard)
Plan: docs/superpowers/plans/2026-07-29-tos-access-guard.md
Status: Planned; implementation in progress.
Last activity: 2026-07-29 - Approved design and implementation plan created.

Progress: [#########-] 90%
```

Add the signed-cookie decision to Accumulated Context and keep existing blockers intact.

- [ ] **Step 4: Verify the planning-only diff**

Run:

```bash
git diff --check -- .planning/PROJECT.md .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md
git diff -- .planning/PROJECT.md .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md
```

Expected: no whitespace errors; every `TOS-*` ID appears once in the requirement definition, once in roadmap coverage, and once in requirement traceability.

- [ ] **Step 5: Commit planning registration**

```bash
git add .planning/PROJECT.md .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md
git commit -m "docs: register phase 10 TOS guard"
```

---

### Task 2: Build the signed session-bound token

**Files:**
- Create: `src/lib/tos-access.ts`
- Create: `__tests__/lib/tos-access.test.ts`

**Interfaces:**
- Consumes: Native `crypto.subtle`, `TextEncoder`, `TextDecoder`, `btoa`, and `atob`.
- Produces: All constants and pure functions in “Shared interfaces locked by this plan.”

- [ ] **Step 1: Write the failing token tests**

Create `__tests__/lib/tos-access.test.ts`:

```ts
/** @jest-environment node */
import {
  TOS_TTL_SECONDS,
  TOS_VERSION,
  createTosAccessToken,
  readSessionToken,
  verifyTosAccessToken,
} from '@/lib/tos-access';

const NOW = Date.parse('2026-07-29T00:00:00.000Z');
const SECRET = 'test-only-tos-signing-secret';
const SESSION = 'session-token-learner@example.test';
const encoder = new TextEncoder();

function base64url(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}

async function signPayload(payload: object): Promise<string> {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`tos-access-v1:${encodedPayload}`),
  );
  return `${encodedPayload}.${base64url(new Uint8Array(signature))}`;
}

describe('TOS access token', () => {
  test('accepts a valid token before the 24-hour boundary', async () => {
    const token = await createTosAccessToken(SESSION, SECRET, NOW);

    await expect(
      verifyTosAccessToken(token, SESSION, SECRET, NOW + TOS_TTL_SECONDS * 1000 - 1),
    ).resolves.toBe(true);
  });

  test('rejects a token at the exact 24-hour boundary', async () => {
    const token = await createTosAccessToken(SESSION, SECRET, NOW);

    await expect(
      verifyTosAccessToken(token, SESSION, SECRET, NOW + TOS_TTL_SECONDS * 1000),
    ).resolves.toBe(false);
  });

  test('rejects expired, wrong-version, wrong-session, and overlong tokens', async () => {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(SESSION));
    const sessionHash = base64url(new Uint8Array(digest));
    const expired = await signPayload({
      version: TOS_VERSION,
      expiresAt: NOW - 1,
      sessionHash,
    });
    const wrongVersion = await signPayload({
      version: '2026-07-28',
      expiresAt: NOW + 1_000,
      sessionHash,
    });
    const overlong = await signPayload({
      version: TOS_VERSION,
      expiresAt: NOW + (TOS_TTL_SECONDS + 1) * 1000,
      sessionHash,
    });

    await expect(verifyTosAccessToken(expired, SESSION, SECRET, NOW)).resolves.toBe(false);
    await expect(verifyTosAccessToken(wrongVersion, SESSION, SECRET, NOW)).resolves.toBe(false);
    await expect(verifyTosAccessToken(overlong, SESSION, SECRET, NOW)).resolves.toBe(false);

    const valid = await createTosAccessToken(SESSION, SECRET, NOW);
    await expect(verifyTosAccessToken(valid, 'different-session', SECRET, NOW)).resolves.toBe(false);
  });

  test('rejects tampered payloads and signatures', async () => {
    const token = await createTosAccessToken(SESSION, SECRET, NOW);
    const [payload, signature] = token.split('.');
    const tamperedPayload = `${payload[0] === 'A' ? 'B' : 'A'}${payload.slice(1)}`;
    const tamperedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;

    await expect(
      verifyTosAccessToken(`${tamperedPayload}.${signature}`, SESSION, SECRET, NOW),
    ).resolves.toBe(false);
    await expect(
      verifyTosAccessToken(`${payload}.${tamperedSignature}`, SESSION, SECRET, NOW),
    ).resolves.toBe(false);
  });

  test.each([
    [undefined, SESSION, SECRET],
    ['', SESSION, SECRET],
    ['invalid', SESSION, SECRET],
    ['a.b.c', SESSION, SECRET],
    ['a.b', undefined, SECRET],
    ['a.b', SESSION, undefined],
  ])('fails closed for missing or malformed inputs', async (token, session, secret) => {
    await expect(verifyTosAccessToken(token, session, secret, NOW)).resolves.toBe(false);
  });

  test('stores only a session hash, never the raw session or email', async () => {
    const token = await createTosAccessToken(SESSION, SECRET, NOW);
    const decodedPayload = Buffer.from(token.split('.')[0], 'base64url').toString('utf8');

    expect(decodedPayload).not.toContain(SESSION);
    expect(decodedPayload).not.toContain('learner@example.test');
    expect(JSON.parse(decodedPayload)).toMatchObject({
      version: TOS_VERSION,
      expiresAt: NOW + TOS_TTL_SECONDS * 1000,
      sessionHash: expect.any(String),
    });
  });

  test('reads the secure cookie first, then the development cookie', () => {
    const values = new Map([
      ['next-auth.session-token', { value: 'development' }],
      ['__Secure-next-auth.session-token', { value: 'secure' }],
    ]);

    expect(readSessionToken({ get: (name) => values.get(name) })).toBe('secure');
    values.delete('__Secure-next-auth.session-token');
    expect(readSessionToken({ get: (name) => values.get(name) })).toBe('development');
  });
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
npm test -- --runInBand __tests__/lib/tos-access.test.ts
```

Expected: FAIL because `@/lib/tos-access` does not exist.

- [ ] **Step 3: Implement the minimum Edge-compatible helper**

Create `src/lib/tos-access.ts`:

```ts
export const TOS_COOKIE_NAME = 'tos_access';
export const TOS_REQUIRED_CODE = 'TOS_ACCEPTANCE_REQUIRED';
export const TOS_VERSION = '2026-07-29';
export const TOS_TTL_SECONDS = 86_400;

export const NEXTAUTH_SESSION_COOKIE_NAMES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
] as const;

const SIGNATURE_DOMAIN = 'tos-access-v1:';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type TosAccessPayload = {
  version: string;
  expiresAt: number;
  sessionHash: string;
};

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function readSessionToken(cookieStore: CookieReader): string | undefined {
  for (const name of NEXTAUTH_SESSION_COOKIE_NAMES) {
    const value = cookieStore.get(name)?.value;
    if (value) return value;
  }
  return undefined;
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function hashSessionToken(sessionToken: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(sessionToken));
  return encodeBase64Url(new Uint8Array(digest));
}

async function importHmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  );
}

export async function createTosAccessToken(
  sessionToken: string,
  secret: string,
  nowMs = Date.now(),
): Promise<string> {
  if (!sessionToken || !secret) {
    throw new Error('TOS signing inputs are missing');
  }

  const payload: TosAccessPayload = {
    version: TOS_VERSION,
    expiresAt: nowMs + TOS_TTL_SECONDS * 1000,
    sessionHash: await hashSessionToken(sessionToken),
  };
  const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${SIGNATURE_DOMAIN}${encodedPayload}`),
  );

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyTosAccessToken(
  token: string | undefined,
  sessionToken: string | undefined,
  secret: string | undefined,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!token || !sessionToken || !secret) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

    const [encodedPayload, encodedSignature] = parts;
    const key = await importHmacKey(secret, ['verify']);
    const signatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(encodedSignature),
      encoder.encode(`${SIGNATURE_DOMAIN}${encodedPayload}`),
    );
    if (!signatureValid) return false;

    const payload = JSON.parse(
      decoder.decode(decodeBase64Url(encodedPayload)),
    ) as Partial<TosAccessPayload>;
    if (
      payload.version !== TOS_VERSION ||
      typeof payload.expiresAt !== 'number' ||
      !Number.isSafeInteger(payload.expiresAt) ||
      typeof payload.sessionHash !== 'string' ||
      payload.expiresAt <= nowMs ||
      payload.expiresAt > nowMs + TOS_TTL_SECONDS * 1000
    ) {
      return false;
    }

    return payload.sessionHash === await hashSessionToken(sessionToken);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
npm test -- --runInBand __tests__/lib/tos-access.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the token helper**

```bash
git add src/lib/tos-access.ts __tests__/lib/tos-access.test.ts
git commit -m "feat: sign session-bound TOS access"
```

---

### Task 3: Add the acceptance route and server adapter

**Files:**
- Create: `src/lib/tos-access-server.ts`
- Create: `src/app/api/tos/accept/route.ts`
- Create: `__tests__/api/tos-accept.test.ts`

**Interfaces:**
- Consumes: `readSessionToken`, `createTosAccessToken`, `verifyTosAccessToken`, and TOS constants from Task 2.
- Produces: `POST /api/tos/accept`, `hasTosAccess()`, `requireTosAccess()`, and `tosAcceptanceRequiredResponse()`.

- [ ] **Step 1: Write the failing route tests**

Create `__tests__/api/tos-accept.test.ts`:

```ts
/** @jest-environment node */
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tos/accept/route';
import {
  TOS_COOKIE_NAME,
  TOS_TTL_SECONDS,
  TOS_VERSION,
  verifyTosAccessToken,
} from '@/lib/tos-access';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockedGetServerSession = getServerSession as jest.Mock;
const SESSION_TOKEN = 'test-session-token';
const SECRET = 'test-only-nextauth-secret';
const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const originalEnv = process.env;

function acceptRequest(
  body: unknown,
  {
    origin = 'https://app.example.test',
    cookie = `next-auth.session-token=${SESSION_TOKEN}`,
    contentType = 'application/json',
  }: { origin?: string; cookie?: string; contentType?: string } = {},
) {
  return new NextRequest('https://app.example.test/api/tos/accept', {
    method: 'POST',
    headers: {
      origin,
      cookie,
      'content-type': contentType,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/tos/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    process.env = { ...originalEnv, NEXTAUTH_SECRET: SECRET };
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'learner@example.test' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns 401 without an authenticated session', async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const response = await POST(acceptRequest({ accepted: true, version: TOS_VERSION }));
    expect(response.status).toBe(401);
  });

  test('returns 401 when the raw database-session cookie is missing', async () => {
    const response = await POST(
      acceptRequest({ accepted: true, version: TOS_VERSION }, { cookie: '' }),
    );
    expect(response.status).toBe(401);
  });

  test.each([
    [{ accepted: false, version: TOS_VERSION }, 'application/json'],
    [{ accepted: true, version: 'stale' }, 'application/json'],
    [{ accepted: true, version: TOS_VERSION, extra: true }, 'application/json'],
    ['{bad-json', 'application/json'],
    [{ accepted: true, version: TOS_VERSION }, 'text/plain'],
  ])('returns 400 for invalid JSON contracts', async (body, contentType) => {
    const response = await POST(acceptRequest(body, { contentType }));
    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  test('returns 403 for a cross-origin POST', async () => {
    const response = await POST(
      acceptRequest(
        { accepted: true, version: TOS_VERSION },
        { origin: 'https://attacker.example.test' },
      ),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  test('fails closed when NEXTAUTH_SECRET is missing', async () => {
    delete process.env.NEXTAUTH_SECRET;
    const response = await POST(acceptRequest({ accepted: true, version: TOS_VERSION }));
    expect(response.status).toBe(500);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  test('sets a verifiable HttpOnly cookie for exactly 86400 seconds', async () => {
    const response = await POST(acceptRequest({ accepted: true, version: TOS_VERSION }));
    const body = await response.json();
    const setCookie = response.headers.get('set-cookie') ?? '';
    const cookieValue = setCookie.match(new RegExp(`${TOS_COOKIE_NAME}=([^;]+)`))?.[1];

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({
      accepted: true,
      expiresAt: NOW + TOS_TTL_SECONDS * 1000,
    });
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=86400');
    expect(setCookie).toContain('Expires=');
    await expect(
      verifyTosAccessToken(cookieValue, SESSION_TOKEN, SECRET, NOW),
    ).resolves.toBe(true);

    const exposed = `${JSON.stringify(body)} ${setCookie}`;
    expect(exposed).not.toContain(SESSION_TOKEN);
    expect(exposed).not.toContain(SECRET);
    expect(exposed).not.toContain('learner@example.test');
  });

  test('adds Secure in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const response = await POST(acceptRequest({ accepted: true, version: TOS_VERSION }));
      expect(response.headers.get('set-cookie')).toContain('Secure');
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
```

- [ ] **Step 2: Run the route test and verify the expected failure**

Run:

```bash
npm test -- --runInBand __tests__/api/tos-accept.test.ts
```

Expected: FAIL because the route and server adapter do not exist.

- [ ] **Step 3: Implement the server cookie adapter**

Create `src/lib/tos-access-server.ts`:

```ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import {
  TOS_COOKIE_NAME,
  TOS_REQUIRED_CODE,
  readSessionToken,
  verifyTosAccessToken,
} from '@/lib/tos-access';

export async function hasTosAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyTosAccessToken(
    cookieStore.get(TOS_COOKIE_NAME)?.value,
    readSessionToken(cookieStore),
    process.env.NEXTAUTH_SECRET,
  );
}

export async function requireTosAccess(): Promise<void> {
  if (!(await hasTosAccess())) {
    redirect('/tos-approval');
  }
}

export function tosAcceptanceRequiredResponse(): NextResponse {
  const response = NextResponse.json(
    { code: TOS_REQUIRED_CODE },
    { status: 403 },
  );
  response.cookies.delete(TOS_COOKIE_NAME);
  return response;
}
```

- [ ] **Step 4: Implement the acceptance route**

Create `src/app/api/tos/accept/route.ts`:

```ts
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import {
  TOS_COOKIE_NAME,
  TOS_TTL_SECONDS,
  TOS_VERSION,
  createTosAccessToken,
  readSessionToken,
} from '@/lib/tos-access';

type AcceptanceBody = {
  accepted: true;
  version: typeof TOS_VERSION;
};

function isAcceptanceBody(value: unknown): value is AcceptanceBody {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    record.accepted === true &&
    record.version === TOS_VERSION
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ code: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const sessionToken = readSessionToken(req.cookies);
  if (!sessionToken) {
    return NextResponse.json({ code: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  if (req.headers.get('origin') !== req.nextUrl.origin) {
    return NextResponse.json({ code: 'INVALID_ORIGIN' }, { status: 403 });
  }

  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ code: 'INVALID_TOS_ACCEPTANCE' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!isAcceptanceBody(body)) {
    return NextResponse.json({ code: 'INVALID_TOS_ACCEPTANCE' }, { status: 400 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ code: 'TOS_CONFIGURATION_ERROR' }, { status: 500 });
  }

  try {
    const nowMs = Date.now();
    const expiresAt = nowMs + TOS_TTL_SECONDS * 1000;
    const token = await createTosAccessToken(sessionToken, secret, nowMs);
    const response = NextResponse.json(
      { accepted: true, expiresAt },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set({
      name: TOS_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TOS_TTL_SECONDS,
      expires: new Date(expiresAt),
    });
    return response;
  } catch {
    return NextResponse.json({ code: 'TOS_ACCEPTANCE_FAILED' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run the focused route and token tests**

Run:

```bash
npm test -- --runInBand __tests__/lib/tos-access.test.ts __tests__/api/tos-accept.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the acceptance boundary**

```bash
git add src/lib/tos-access-server.ts src/app/api/tos/accept/route.ts __tests__/api/tos-accept.test.ts
git commit -m "feat: accept TOS for current session"
```

---

### Task 4: Gate protected routes in Proxy

**Files:**
- Modify: `src/proxy.ts`
- Create: `__tests__/proxy-tos.test.ts`

**Interfaces:**
- Consumes: `TOS_COOKIE_NAME`, `TOS_REQUIRED_CODE`, `readSessionToken()`, and `verifyTosAccessToken()`.
- Produces: Protected-page rewrite, protected-API JSON denial, valid pass-through, and invalid-cookie clearing.

- [ ] **Step 1: Write the failing Proxy tests**

Create `__tests__/proxy-tos.test.ts`:

```ts
/** @jest-environment node */
import { NextRequest } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { verifyTosAccessToken } from '@/lib/tos-access';
import { proxy } from '@/proxy';

jest.mock('@/lib/redis', () => ({ getRedisClient: jest.fn() }));
jest.mock('@/lib/tos-access', () => {
  const actual = jest.requireActual('@/lib/tos-access');
  return { ...actual, verifyTosAccessToken: jest.fn() };
});

const mockedGetRedisClient = getRedisClient as jest.Mock;
const mockedVerify = verifyTosAccessToken as jest.Mock;
const originalEnv = process.env;

function request(path: string, cookie = 'next-auth.session-token=session-A') {
  return new NextRequest(`https://app.example.test${path}`, {
    headers: { cookie },
  });
}

describe('Proxy TOS gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NEXTAUTH_SECRET: 'test-only-secret' };
    mockedGetRedisClient.mockReturnValue(null);
    mockedVerify.mockResolvedValue(false);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test.each(['/courses', '/courses/course-1', '/watch/video-1', '/meeting'])(
    'rewrites protected page %s to the consent surface',
    async (path) => {
      if (path === '/meeting') {
        mockedGetRedisClient.mockReturnValue({
          get: jest.fn(async (key: string) =>
            key === 'config:system_mode' ? 'meeting' : null,
          ),
        });
      }
      const response = await proxy(request(path));
      expect(response.headers.get('x-middleware-rewrite')).toBe(
        'https://app.example.test/tos-approval',
      );
    },
  );

  test.each(['/api/drm/token', '/api/zoom/signature'])(
    'returns JSON 403 for protected API %s',
    async (path) => {
      const response = await proxy(request(path));
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        code: 'TOS_ACCEPTANCE_REQUIRED',
      });
      expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    },
  );

  test('passes a valid session-bound acceptance cookie', async () => {
    mockedVerify.mockResolvedValue(true);
    const response = await proxy(
      request('/watch/video-1', 'next-auth.session-token=session-A; tos_access=accept-A'),
    );

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedVerify).toHaveBeenCalledWith(
      'accept-A',
      'session-A',
      'test-only-secret',
    );
  });

  test.each([
    '/tos-approval',
    '/api/tos/accept',
    '/api/auth/session',
    '/_next/static/chunk.js',
  ])('bypasses TOS verification for %s', async (path) => {
    const response = await proxy(request(path));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  test('clears an invalid existing acceptance cookie', async () => {
    const response = await proxy(
      request('/courses', 'next-auth.session-token=session-A; tos_access=bad'),
    );
    expect(response.headers.get('set-cookie')).toContain('tos_access=');
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0|Expires=/u);
  });

  test('applies system-mode denial before TOS verification', async () => {
    mockedGetRedisClient.mockReturnValue({
      get: jest.fn(async (key: string) => key === 'config:system_mode' ? 'meeting' : null),
    });

    const response = await proxy(request('/courses'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('notice=courses_closed');
    expect(mockedVerify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the Proxy test and verify the expected failure**

Run:

```bash
npm test -- --runInBand __tests__/proxy-tos.test.ts
```

Expected: FAIL because current Proxy has no TOS classification or verification.

- [ ] **Step 3: Add route classification and TOS imports**

Add to `src/proxy.ts`:

```ts
import {
  TOS_COOKIE_NAME,
  TOS_REQUIRED_CODE,
  readSessionToken,
  verifyTosAccessToken,
} from '@/lib/tos-access';

const TOS_PAGE_PREFIXES = ['/courses', '/watch', '/meeting'] as const;
const TOS_API_PATHS = new Set(['/api/drm/token', '/api/zoom/signature']);
const TOS_BYPASS_PREFIXES = ['/tos-approval', '/api/tos/accept', '/api/auth', '/_next'] as const;

function isPathOrChild(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}
```

Immediately after `const path = req.nextUrl.pathname`, compute:

```ts
const bypassesTos = TOS_BYPASS_PREFIXES.some((prefix) => isPathOrChild(path, prefix));
const isTosProtectedPage = !bypassesTos &&
  TOS_PAGE_PREFIXES.some((prefix) => isPathOrChild(path, prefix));
const isTosProtectedApi = !bypassesTos && TOS_API_PATHS.has(path);
```

- [ ] **Step 4: Replace the current protected-path block**

Replace the block beginning `// Protected paths` through its early `return NextResponse.next()` with:

```ts
const usesExistingSessionGate =
  path.startsWith('/admin') ||
  path.startsWith('/api/drm') ||
  isPathOrChild(path, '/meeting') ||
  isTosProtectedPage;
const sessionToken = readSessionToken(req.cookies);

if (usesExistingSessionGate) {
  if (!sessionToken) {
    const signInUrl = new URL('/api/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(signInUrl);
  }

  try {
    const redis = getRedisClient();
    if (redis) {
      const isRevoked = await redis.get(`session_revoked:${sessionToken}`);
      if (isRevoked === 'true') {
        const signInUrl = new URL('/api/auth/signin', req.url);
        signInUrl.searchParams.set('error', 'SessionRevoked');
        signInUrl.searchParams.set('callbackUrl', path);
        return NextResponse.redirect(signInUrl);
      }
    }
  } catch (error) {
    console.error('Proxy session revocation check error:', error);
  }
}

if (isTosProtectedApi && !sessionToken) {
  return NextResponse.next();
}

if (isTosProtectedPage || isTosProtectedApi) {
  const acceptanceToken = req.cookies.get(TOS_COOKIE_NAME)?.value;
  const accepted = await verifyTosAccessToken(
    acceptanceToken,
    sessionToken,
    process.env.NEXTAUTH_SECRET,
  );

  if (!accepted) {
    const response = isTosProtectedApi
      ? NextResponse.json({ code: TOS_REQUIRED_CODE }, { status: 403 })
      : NextResponse.rewrite(new URL('/tos-approval', req.url));

    if (acceptanceToken) {
      response.cookies.delete(TOS_COOKIE_NAME);
    }
    return response;
  }
}

return NextResponse.next();
```

This removes the existing Redis-unavailable early return; Redis remains fail-open for revocation, but TOS verification still runs.

- [ ] **Step 5: Run Proxy and token tests**

Run:

```bash
npm test -- --runInBand __tests__/proxy-tos.test.ts __tests__/lib/tos-access.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the early gate**

```bash
git add src/proxy.ts __tests__/proxy-tos.test.ts
git commit -m "feat: gate protected routes on TOS"
```

---

### Task 5: Add server-side data and credential guards

**Files:**
- Modify: `src/app/courses/page.tsx`
- Modify: `src/app/courses/[courseId]/page.tsx`
- Modify: `src/app/watch/[videoId]/page.tsx`
- Modify: `src/app/api/drm/token/route.ts`
- Modify: `src/app/api/zoom/signature/route.ts`
- Create: `__tests__/app/tos-protected-pages.test.tsx`
- Modify: `__tests__/api/media-routes.test.ts`
- Modify: `__tests__/api/zoom-signature.test.ts`

**Interfaces:**
- Consumes: `requireTosAccess()`, `hasTosAccess()`, and `tosAcceptanceRequiredResponse()`.
- Produces: Defense in depth before Prisma course reads, media entitlement, Tencent token creation, Zoom config/database reads, or Zoom signature generation.

- [ ] **Step 1: Write failing protected-page tests**

Create `__tests__/app/tos-protected-pages.test.tsx`:

```tsx
/** @jest-environment node */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { evaluateMediaEntitlement } from '@/lib/media-entitlement';
import { createTencentDrmToken } from '@/lib/tencent/vod';
import { requireTosAccess } from '@/lib/tos-access-server';
import CoursesPage from '@/app/courses/page';
import CoursePage from '@/app/courses/[courseId]/page';
import WatchPage from '@/app/watch/[videoId]/page';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/tos-access-server', () => ({
  requireTosAccess: jest.fn(),
}));
jest.mock('@/lib/redis', () => ({
  getCached: jest.fn((_key, load) => load()),
}));
jest.mock('@/lib/media-entitlement', () => ({
  evaluateMediaEntitlement: jest.fn(),
}));
jest.mock('@/lib/tencent/vod', () => ({
  createTencentDrmToken: jest.fn(),
  createTencentSimpleAesPlaybackUrl: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    course: { findUnique: jest.fn(), findMany: jest.fn() },
    enrollment: { findMany: jest.fn(), findUnique: jest.fn() },
    allowedEmail: { findUnique: jest.fn() },
    video: { findMany: jest.fn() },
    watchRecord: { findMany: jest.fn() },
  },
}));
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: jest.fn(() => {
    throw new Error('notFound');
  }),
}));

const mockedSession = getServerSession as jest.Mock;
const mockedRequireTos = requireTosAccess as jest.Mock;
const mockedEvaluate = evaluateMediaEntitlement as jest.Mock;
const mockedCreateToken = createTencentDrmToken as jest.Mock;
const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  course: { findUnique: jest.Mock; findMany: jest.Mock };
  enrollment: { findMany: jest.Mock; findUnique: jest.Mock };
};

describe('protected Server Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSession.mockResolvedValue({
      user: { id: 'user-1', email: 'learner@example.test' },
    });
    mockedRequireTos.mockRejectedValue(new Error('TOS required'));
  });

  test('courses list performs no learner/course query before TOS', async () => {
    await expect(CoursesPage()).rejects.toThrow('TOS required');
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.course.findMany).not.toHaveBeenCalled();
  });

  test('course detail performs no course query before TOS', async () => {
    await expect(
      CoursePage({ params: Promise.resolve({ courseId: 'course-1' }) }),
    ).rejects.toThrow('TOS required');
    expect(mockedPrisma.course.findUnique).not.toHaveBeenCalled();
  });

  test('watch performs no entitlement or Tencent token work before TOS', async () => {
    await expect(
      WatchPage({ params: Promise.resolve({ videoId: 'video-1' }) }),
    ).rejects.toThrow('TOS required');
    expect(mockedEvaluate).not.toHaveBeenCalled();
    expect(mockedCreateToken).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Add failing DRM and Zoom route assertions**

In `__tests__/api/media-routes.test.ts`, mock the server adapter and default it to allowed:

```ts
import { hasTosAccess } from '@/lib/tos-access-server';

jest.mock('@/lib/tos-access-server', () => ({
  hasTosAccess: jest.fn(),
  tosAcceptanceRequiredResponse: jest.fn(() =>
    Response.json({ code: 'TOS_ACCEPTANCE_REQUIRED' }, { status: 403 }),
  ),
}));

const mockedHasTosAccess = hasTosAccess as jest.Mock;
```

Add to `beforeEach`:

```ts
mockedHasTosAccess.mockResolvedValue(true);
```

Add this test:

```ts
test('DRM token route denies authenticated requests before entitlement when TOS is missing', async () => {
  mockedHasTosAccess.mockResolvedValue(false);

  const response = await drmTokenPost(jsonRequest({ videoId: 'video-1' }));

  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toEqual({
    code: 'TOS_ACCEPTANCE_REQUIRED',
  });
  expect(mockedEvaluate).not.toHaveBeenCalled();
  expect(mockedCreateTencentDrmToken).not.toHaveBeenCalled();
});
```

Apply the same adapter mock/default in `__tests__/api/zoom-signature.test.ts`, then add:

```ts
test('rejects authenticated requests before config or database work when TOS is missing', async () => {
  mockedGetServerSession.mockResolvedValue({
    user: { email: 'learner@example.test', role: 'USER' },
  });
  mockedHasTosAccess.mockResolvedValue(false);

  const response = await zoomSignaturePost(request());

  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toEqual({
    code: 'TOS_ACCEPTANCE_REQUIRED',
  });
  expect(mockedPrisma.allowedEmail.findUnique).not.toHaveBeenCalled();
  expect(mockedPrisma.watermarkSettings.findUnique).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run the tests and verify denial checks fail**

Run:

```bash
npm test -- --runInBand __tests__/app/tos-protected-pages.test.tsx __tests__/api/media-routes.test.ts __tests__/api/zoom-signature.test.ts
```

Expected: FAIL because protected pages and token routes do not call the TOS adapter.

- [ ] **Step 4: Guard the three Server Components**

Import `requireTosAccess` in each page. Place `await requireTosAccess()` after authentication and before every protected query:

```ts
// src/app/courses/page.tsx
if (!session?.user?.email) {
  redirect('/auth/signin');
}
await requireTosAccess();
```

```ts
// src/app/courses/[courseId]/page.tsx
import { notFound, redirect } from 'next/navigation';

const session = await getServerSession(authOptions);
if (!session?.user?.email) {
  redirect('/auth/signin');
}
await requireTosAccess();
```

```ts
// src/app/watch/[videoId]/page.tsx
if (!session) {
  redirect('/api/auth/signin');
}
await requireTosAccess();
```

- [ ] **Step 5: Guard DRM and Zoom credential issuance**

In `src/app/api/drm/token/route.ts`, import `hasTosAccess` and `tosAcceptanceRequiredResponse`. After `videoId` validation and before `evaluateMediaEntitlement`, add:

```ts
if (session && !(await hasTosAccess())) {
  return tosAcceptanceRequiredResponse();
}
```

This preserves the current unauthenticated entitlement mapping while blocking authenticated direct token requests.

In `src/app/api/zoom/signature/route.ts`, after the existing session `401` block and before reading Zoom environment configuration, add:

```ts
if (!(await hasTosAccess())) {
  return tosAcceptanceRequiredResponse();
}
```

- [ ] **Step 6: Run protected boundary tests**

Run:

```bash
npm test -- --runInBand __tests__/app/tos-protected-pages.test.tsx __tests__/api/media-routes.test.ts __tests__/api/zoom-signature.test.ts
```

Expected: PASS, including pre-existing media entitlement and Zoom signature allow tests.

- [ ] **Step 7: Commit defense in depth**

```bash
git add src/app/courses/page.tsx src/app/courses/[courseId]/page.tsx src/app/watch/[videoId]/page.tsx src/app/api/drm/token/route.ts src/app/api/zoom/signature/route.ts __tests__/app/tos-protected-pages.test.tsx __tests__/api/media-routes.test.ts __tests__/api/zoom-signature.test.ts
git commit -m "feat: enforce TOS before protected data"
```

---

### Task 6: Build the accessible consent UI and remove duplicate IPR consent

**Files:**
- Create: `src/components/tos/TosConsentDialog.tsx`
- Create: `src/app/tos-approval/page.tsx`
- Modify: `src/lib/translations.ts`
- Modify: `src/components/course/WatchPageClient.tsx`
- Delete: `src/components/course/IPRConsentOverlay.tsx`
- Create: `__tests__/components/tos-consent-dialog.test.tsx`

**Interfaces:**
- Consumes: `TOS_VERSION`, existing `Dialog`, `Checkbox`, `ScrollArea`, `Button`, and `useLanguage()`.
- Produces: `TosConsentDialog({ onAccepted?, onDecline? })`, acceptance POST, explicit refusal, and current-URL reload by default.

- [ ] **Step 1: Write failing component tests**

Create `__tests__/components/tos-consent-dialog.test.tsx`:

```tsx
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TosConsentDialog from '@/components/tos/TosConsentDialog';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

let frames: FrameRequestCallback[] = [];

function setViewport(
  viewport: HTMLElement,
  { scrollHeight, clientHeight, scrollTop = 0 }: {
    scrollHeight: number;
    clientHeight: number;
    scrollTop?: number;
  },
) {
  Object.defineProperties(viewport, {
    scrollHeight: { configurable: true, value: scrollHeight },
    clientHeight: { configurable: true, value: clientHeight },
    scrollTop: { configurable: true, writable: true, value: scrollTop },
  });
}

function finishMeasurement(viewport: HTMLElement, dimensions: Parameters<typeof setViewport>[1]) {
  setViewport(viewport, dimensions);
  act(() => {
    const pending = frames;
    frames = [];
    pending.forEach((frame) => frame(0));
  });
}

describe('TosConsentDialog', () => {
  beforeEach(() => {
    frames = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
      frames.push(frame);
      return frames.length;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('keeps confirmation disabled until overflowing content reaches the end', () => {
    render(<TosConsentDialog />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 600, clientHeight: 200 });

    const checkbox = screen.getByRole('checkbox', { name: 'tosConfirmation' });
    expect(checkbox).toBeDisabled();
    expect(screen.getByRole('button', { name: 'tosAgree' })).toBeDisabled();

    viewport.scrollTop = 399;
    fireEvent.scroll(viewport);
    expect(checkbox).toBeEnabled();

    fireEvent.click(checkbox);
    expect(screen.getByRole('button', { name: 'tosAgree' })).toBeEnabled();
  });

  test('unlocks confirmation when all content fits without scrolling', () => {
    render(<TosConsentDialog />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 200, clientHeight: 200 });
    expect(screen.getByRole('checkbox', { name: 'tosConfirmation' })).toBeEnabled();
  });

  test('cannot dismiss into protected content and supports explicit decline', () => {
    const onDecline = jest.fn();
    render(<TosConsentDialog onDecline={onDecline} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'tosDecline' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: 'tosScrollRegionLabel' })).toHaveAttribute('tabindex', '0');
  });

  test('prevents duplicate submission and calls success action once', async () => {
    let resolveFetch!: (value: Response) => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const onAccepted = jest.fn();
    render(<TosConsentDialog onAccepted={onAccepted} />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 200, clientHeight: 200 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'tosConfirmation' }));

    const agree = screen.getByRole('button', { name: 'tosAgree' });
    fireEvent.click(agree);
    fireEvent.click(agree);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'tosSubmitting' })).toBeDisabled();

    resolveFetch({ ok: true } as Response);
    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1));
  });

  test('shows an error and permits retry without granting access', async () => {
    const onAccepted = jest.fn();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);
    render(<TosConsentDialog onAccepted={onAccepted} />);
    const region = screen.getByRole('region', { name: 'tosScrollRegionLabel' });
    const viewport = region.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')!;
    finishMeasurement(viewport, { scrollHeight: 200, clientHeight: 200 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'tosConfirmation' }));
    fireEvent.click(screen.getByRole('button', { name: 'tosAgree' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('tosSubmitError');
    expect(onAccepted).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'tosAgree' }));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2: Run the component test and verify the expected failure**

Run:

```bash
npm test -- --runInBand __tests__/components/tos-consent-dialog.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Add equivalent bilingual copy**

Add these keys to both language objects in `src/lib/translations.ts`:

```ts
// English
tosTitle: 'Terms of Service',
tosDescription: 'Read the complete terms before continuing to protected learning content.',
tosScrollRegionLabel: 'Complete Terms of Service',
tosReadInstruction: 'Scroll to the end to enable confirmation.',
tosReadComplete: 'Complete terms viewed. You may now confirm.',
tosPersonalTitle: '1. Personal access',
tosPersonalBody: 'Your account, authenticated session, protected links, and course access are for you as the registered user only. Do not share them with anyone.',
tosIntellectualPropertyTitle: '2. Intellectual property',
tosIntellectualPropertyBody: 'Do not copy, download, record, screen-capture, redistribute, stream, or publish course or meeting materials without prior written authorization.',
tosConductTitle: '3. Course and meeting conduct',
tosConductBody: 'Do not disrupt teaching, impersonate another person, or make unauthorized recordings of courses or meetings.',
tosSecurityTitle: '4. Security notice',
tosSecurityBody: 'Protected content may contain visible or invisible watermarks linked to your account. Access and security events may be logged to detect misuse.',
tosLifetimeTitle: '5. Acceptance lifetime',
tosLifetimeBody: 'Acceptance applies only to this browser and authenticated session for up to 24 hours. Logout, account change, expiry, or a new Terms version requires acceptance again.',
tosConfirmation: 'I confirm that I have scrolled through and read the complete terms above, and I agree to follow them.',
tosAgree: 'Agree and continue',
tosDecline: 'Decline',
tosSubmitting: 'Saving acceptance...',
tosSubmitError: 'Acceptance could not be saved. Check your connection and try again.',
```

```ts
// Vietnamese
tosTitle: 'Điều khoản sử dụng',
tosDescription: 'Đọc toàn bộ điều khoản trước khi tiếp tục vào nội dung học tập được bảo vệ.',
tosScrollRegionLabel: 'Toàn bộ Điều khoản sử dụng',
tosReadInstruction: 'Cuộn đến cuối nội dung để mở xác nhận.',
tosReadComplete: 'Đã xem toàn bộ điều khoản. Bạn có thể xác nhận.',
tosPersonalTitle: '1. Quyền truy cập cá nhân',
tosPersonalBody: 'Tài khoản, phiên đăng nhập, liên kết được bảo vệ và quyền truy cập khóa học chỉ dành cho chính người dùng đã đăng ký. Không chia sẻ cho bất kỳ ai.',
tosIntellectualPropertyTitle: '2. Quyền sở hữu trí tuệ',
tosIntellectualPropertyBody: 'Không sao chép, tải xuống, ghi âm, ghi hình, chụp màn hình, phân phối lại, phát trực tiếp hoặc công bố tài liệu khóa học hay buổi học nếu chưa có văn bản cho phép.',
tosConductTitle: '3. Quy tắc khóa học và buổi học',
tosConductBody: 'Không làm gián đoạn việc giảng dạy, mạo danh người khác hoặc ghi lại khóa học hay buổi học khi chưa được phép.',
tosSecurityTitle: '4. Thông báo bảo mật',
tosSecurityBody: 'Nội dung được bảo vệ có thể chứa watermark hữu hình hoặc vô hình gắn với tài khoản. Sự kiện truy cập và bảo mật có thể được ghi nhận để phát hiện hành vi lạm dụng.',
tosLifetimeTitle: '5. Thời hạn chấp thuận',
tosLifetimeBody: 'Chấp thuận chỉ áp dụng cho trình duyệt và phiên đăng nhập hiện tại trong tối đa 24 giờ. Đăng xuất, đổi tài khoản, hết hạn hoặc phiên bản điều khoản mới sẽ yêu cầu chấp thuận lại.',
tosConfirmation: 'Tôi xác nhận đã cuộn đọc toàn bộ nội dung trên và đồng ý tuân thủ các điều khoản này.',
tosAgree: 'Đồng ý và tiếp tục',
tosDecline: 'Không đồng ý',
tosSubmitting: 'Đang lưu chấp thuận...',
tosSubmitError: 'Không thể lưu chấp thuận. Kiểm tra kết nối và thử lại.',
```

- [ ] **Step 4: Implement the consent dialog**

Create `src/components/tos/TosConsentDialog.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TOS_VERSION } from '@/lib/tos-access';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const SCROLL_END_TOLERANCE_PX = 4;
const SECTION_KEYS = [
  ['tosPersonalTitle', 'tosPersonalBody'],
  ['tosIntellectualPropertyTitle', 'tosIntellectualPropertyBody'],
  ['tosConductTitle', 'tosConductBody'],
  ['tosSecurityTitle', 'tosSecurityBody'],
  ['tosLifetimeTitle', 'tosLifetimeBody'],
] as const;

type TosConsentDialogProps = {
  onAccepted?: () => void;
  onDecline?: () => void;
};

function reachedEnd(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <=
    SCROLL_END_TOLERANCE_PX;
}

export default function TosConsentDialog({
  onAccepted = () => window.location.reload(),
  onDecline = () => window.location.assign('/'),
}: TosConsentDialogProps = {}) {
  const { language, t } = useLanguage();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const [hasRead, setHasRead] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markReadAtEnd = useCallback((element: HTMLElement) => {
    if (reachedEnd(element)) setHasRead(true);
  }, []);

  useEffect(() => {
    setHasRead(false);
    setConfirmed(false);
    const measure = () => {
      const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
        '[data-radix-scroll-area-viewport]',
      );
      if (viewport) markReadAtEnd(viewport);
    };
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [language, markReadAtEnd]);

  async function accept() {
    if (!hasRead || !confirmed || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tos/accept', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true, version: TOS_VERSION }),
      });
      if (!response.ok) throw new Error('acceptance rejected');
      onAccepted();
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setError(t('tosSubmitError'));
    }
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] gap-4 sm:max-w-2xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-full bg-red-500/10 p-2 text-red-600">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <DialogTitle>{t('tosTitle')}</DialogTitle>
          </div>
          <DialogDescription>{t('tosDescription')}</DialogDescription>
        </DialogHeader>

        <ScrollArea
          ref={scrollAreaRef}
          role="region"
          aria-label={t('tosScrollRegionLabel')}
          tabIndex={0}
          className="h-[min(48vh,28rem)] rounded-md border"
          onScrollCapture={(event) => {
            if (event.target instanceof HTMLElement) {
              markReadAtEnd(event.target);
            }
          }}
        >
          <div className="space-y-5 p-4 pr-6 text-sm leading-6">
            {SECTION_KEYS.map(([titleKey, bodyKey]) => (
              <section key={titleKey} className="space-y-1">
                <h2 className="font-semibold text-foreground">{t(titleKey)}</h2>
                <p className="text-muted-foreground">{t(bodyKey)}</p>
              </section>
            ))}
          </div>
        </ScrollArea>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t(hasRead ? 'tosReadComplete' : 'tosReadInstruction')}
        </p>

        <div className="flex items-start gap-3">
          <Checkbox
            id="tos-confirmation"
            checked={confirmed}
            disabled={!hasRead || submitting}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <label htmlFor="tos-confirmation" className="text-sm leading-5">
            {t('tosConfirmation')}
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={onDecline}>
            {t('tosDecline')}
          </Button>
          <Button
            type="button"
            disabled={!hasRead || !confirmed || submitting}
            onClick={accept}
          >
            {t(submitting ? 'tosSubmitting' : 'tosAgree')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Add the consent page**

Create `src/app/tos-approval/page.tsx`:

```tsx
import TosConsentDialog from '@/components/tos/TosConsentDialog';

export default function TosApprovalPage() {
  return (
    <main className="flex min-h-[calc(100vh-2.75rem)] items-center justify-center bg-muted/30 p-4">
      <TosConsentDialog />
    </main>
  );
}
```

- [ ] **Step 6: Remove player-local consent**

In `src/components/course/WatchPageClient.tsx`:

- Remove the `sonner` and `IPRConsentOverlay` imports.
- Remove `isIPRAccepted` state.
- Replace the full `!isIPRAccepted ? ... : ...` branch with:

```tsx
<>
  <DRMPlayerWrapper
    dashUrl={playbackSources.dashUrl}
    hlsUrl={playbackSources.hlsUrl}
    drmToken={playbackSources.drmToken}
    videoId={videoId}
    viewCount={viewCount}
    viewLimit={viewLimit}
    watermarkText={watermarkText}
    requireHD={false}
    isClearHlsFallback={playbackSources.isClearHlsFallback}
    isFairPlayConfigured={isFairPlayConfigured}
    onFullscreenChange={setIsVideoFullscreen}
  />
  <div className="rounded-lg border border-border bg-card p-4 shadow-none">
    <ChatLogViewer chatLog={chatLog} />
  </div>
</>
```

Delete `src/components/course/IPRConsentOverlay.tsx`. Keep `BrowserBanner`; it already supplies platform-specific Safari/iOS guidance after consent.

- [ ] **Step 7: Run UI and boundary regression tests**

Run:

```bash
npm test -- --runInBand __tests__/components/tos-consent-dialog.test.tsx __tests__/app/tos-protected-pages.test.tsx __tests__/proxy-tos.test.ts
npm run typecheck
```

Expected: PASS. Typecheck proves every new translation key exists in both language objects and the removed component has no remaining import.

- [ ] **Step 8: Commit the consent surface**

```bash
git add src/components/tos/TosConsentDialog.tsx src/app/tos-approval/page.tsx src/lib/translations.ts src/components/course/WatchPageClient.tsx src/components/course/IPRConsentOverlay.tsx __tests__/components/tos-consent-dialog.test.tsx
git commit -m "feat: require reading before TOS acceptance"
```

---

### Task 7: Verify, smoke-test, and close Phase 10

**Files:**
- Modify after successful verification: `.planning/PROJECT.md`
- Modify after successful verification: `.planning/STATE.md`
- Modify after successful verification: `.planning/ROADMAP.md`
- Modify after successful verification: `.planning/REQUIREMENTS.md`

**Interfaces:**
- Consumes: All Tasks 1–6.
- Produces: Evidence for `TOS-01`–`TOS-06` and a truthful Phase 10 closure.

- [ ] **Step 1: Run all targeted TOS tests together**

```bash
npm test -- --runInBand __tests__/lib/tos-access.test.ts __tests__/api/tos-accept.test.ts __tests__/proxy-tos.test.ts __tests__/app/tos-protected-pages.test.tsx __tests__/components/tos-consent-dialog.test.tsx __tests__/api/media-routes.test.ts __tests__/api/zoom-signature.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run repository quality gates in order**

```bash
npm test -- --runInBand
npm run lint
npm run typecheck
npm run build
npm run secrets:scan
```

Expected: every command exits `0`. Existing lint warnings may remain only if unchanged; no new warning may point to a TOS-touched file.

- [ ] **Step 3: Run scoped static security review**

```bash
git diff --check c61ac3b..HEAD
git diff c61ac3b..HEAD -- src/proxy.ts src/lib/tos-access.ts src/lib/tos-access-server.ts src/app/api/tos/accept/route.ts src/app/api/drm/token/route.ts src/app/api/zoom/signature/route.ts
```

Confirm from the diff:

- Proxy is not the sole enforcement point.
- Every credential-producing route checks TOS after authentication.
- `NEXTAUTH_SECRET` is read only server-side.
- No raw session token, secret, email, DRM token, or Zoom credential enters a TOS log/response.
- Cookie expiry and signed expiry are both 86,400 seconds.
- Missing secret and verification exceptions fail closed.
- No database, Redis, dependency, or environment-file change exists.

- [ ] **Step 4: Run browser-visible smoke checks**

Start the app:

```bash
npm run dev
```

Using the in-app Browser or Chrome automation against an authenticated local/staging account:

1. Delete `tos_access`, visit `/courses`, and confirm browser URL stays `/courses` while only consent UI renders.
2. Confirm checkbox and Agree are disabled before end-of-scroll.
3. Reach end using mouse and keyboard; confirm checkbox unlocks, focus remains visible, and Agree stays disabled until checked.
4. Press Escape and click outside; confirm protected content does not appear.
5. Click Decline; confirm navigation to `/` and no `tos_access` cookie.
6. Return, accept, and confirm `/courses` loads; inspect cookie flags and expiry without exposing its value in notes.
7. Navigate to a real `/courses/<id>` and `/watch/<id>`, then switch system mode as the existing app requires and visit `/meeting`; confirm consent is not repeated within the same session.
8. Delete/corrupt `tos_access`; confirm direct `/watch/<id>` returns to consent before playback or token work.
9. Sign out and sign in; confirm the changed NextAuth session requires acceptance again.
10. Switch English/Vietnamese and verify all five sections plus exact confirmation text.
11. Verify mobile viewport scrolling, footer buttons, focus order, and no clipped terms.

The direct DRM/Zoom deny and allow contracts are already deterministic in Jest. Run live provider success smoke only where valid Tencent/Zoom staging credentials and test resources exist; otherwise record that external-provider smoke as `blocked: missing credentials/service access` without weakening the local TOS result.

- [ ] **Step 5: Close GSD only after automated and browser checks pass**

In `.planning/REQUIREMENTS.md`, change `TOS-01`–`TOS-06` to `[x]` and their traceability status to `Complete`. Set coverage to:

```markdown
**Coverage:**
- Active milestone requirements: 81 total
- Complete: 81
- Pending: 0
- Mapped to phases: 81
- Unmapped: 0
```

In `.planning/ROADMAP.md`, mark the Phase 10 plan `[x]`, change its progress row to `1/1 | Complete | 2026-07-29`, and set:

```markdown
**Coverage validated:** 81/81 active milestone requirements mapped exactly once and complete.
```

In `.planning/PROJECT.md`, move the TOS item from Active to Validated and retain the accepted Key Decision.

Update `.planning/STATE.md`:

```markdown
**Current focus:** Phase 10 - 24-Hour TOS Access Guard complete

## Current Position

Phase: 10 of 10 (24-Hour TOS Access Guard)
Plan: docs/superpowers/plans/2026-07-29-tos-access-guard.md
Status: Complete locally; live provider smoke remains governed by existing credential availability.
Last activity: 2026-07-29 - TOS guard implemented and verified.

Progress: [##########] 100%
```

If any required local test or browser check fails, do not mark the requirements complete. Record the exact blocker in `.planning/STATE.md` and resume at the failing step.

- [ ] **Step 6: Verify and commit planning closure separately**

```bash
git diff --check -- .planning/PROJECT.md .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md
git add .planning/PROJECT.md .planning/STATE.md .planning/ROADMAP.md .planning/REQUIREMENTS.md
git commit -m "docs: close phase 10 TOS guard"
```

- [ ] **Step 7: Final repository handoff check**

```bash
git status --short
git log -7 --oneline
```

Expected: no modified tracked files; only the pre-existing untracked `.agents/` and `codex-plugins/` may remain.

Rollback requires no data migration: revert the Phase 10 source commits, then revert the two Phase 10 planning commits. The unused `tos_access` cookie has no effect and expires within 24 hours.
