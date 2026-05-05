# Testing Patterns

**Analysis Date:** 2026-05-05

## Test Framework

**Runner:**
- Not fully installed for the root app. `package.json` has no `test` script and root `devDependencies` do not include Jest, Vitest, Testing Library, Playwright, or Cypress.
- `jest.setup.ts` exists as sanitized environment setup for planned Jest tests, but no `jest.config.*` file exists.
- `test-plan.md` defines the intended Jest + Testing Library + MSW + Playwright strategy.
- `zoom-webapp/Components/package.json` has build/lint/stylelint scripts but no test script.

**Assertion Library:**
- Not active in package scripts.
- Planned unit/API examples in `test-plan.md` use Jest globals: `describe`, `test`, `expect`, and `jest.mock`.
- Planned E2E examples in `test-plan.md` use Playwright `test` and `expect`.

**Run Commands:**
```bash
npm run lint                    # Active root quality gate
npx tsx scripts/verify-auth-sync.ts       # Active verification script for auth display-name sync
npx tsx scripts/verify-azure-storage.ts   # Active Azure connectivity verification; loads local env
npx tsx scripts/verify-axinom-setup.ts    # Active Axinom setup verification; loads local env
```

Planned but not currently runnable from root `package.json`:
```bash
npm test                        # Planned unit/integration tests from test-plan.md
npm test -- --coverage          # Planned coverage command from test-plan.md
npx playwright test             # Planned E2E command from test-plan.md
```

Zoom component demo commands:
```bash
cd zoom-webapp/Components
npm run lint                    # ESLint for demo src
npm run lint:style              # Stylelint for SCSS
npm run build                   # tsc + Vite build
```

## Test File Organization

**Location:**
- No active `*.test.*`, `*.spec.*`, `__tests__`, `tests`, `e2e`, Playwright, Cypress, Jest, or Vitest test files were detected in the root app.
- Planned unit tests in `test-plan.md` use `__tests__/lib/*.test.ts`.
- Planned API tests in `test-plan.md` use `__tests__/api/**/*.test.ts`.
- Planned E2E tests in `test-plan.md` use `e2e/*.spec.ts`.
- Verification scripts live in `scripts/*.ts` and are run directly with `tsx`.

**Naming:**
- Planned Jest files use `*.test.ts`: `__tests__/lib/drm-detection.test.ts`, `__tests__/api/session/validate.test.ts`.
- Planned Playwright files use `*.spec.ts`: `e2e/auth.spec.ts`, `e2e/video-playback.spec.ts`.
- Existing verification scripts use imperative `verify-*` names: `scripts/verify-auth-sync.ts`, `scripts/verify-azure-storage.ts`, `scripts/verify-axinom-setup.ts`.

**Structure:**
```text
__tests__/
├── lib/                 # Planned unit tests for src/lib/*
└── api/                 # Planned API route integration tests

e2e/
└── *.spec.ts            # Planned Playwright critical flow tests

scripts/
└── verify-*.ts          # Current executable verification scripts
```

## Test Structure

**Suite Organization:**
```typescript
// Pattern documented in test-plan.md
import { GET } from '@/app/api/session/validate/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

jest.mock('next-auth');
jest.mock('@/lib/redis');

describe('/api/session/validate', () => {
  test('returns valid:true for authenticated user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' },
    });

    const req = new NextRequest('http://localhost/api/session/validate');
    const response = await GET(req);
    const data = await response.json();

    expect(data.valid).toBe(true);
  });
});
```

**Patterns:**
- Import route handlers directly for API integration tests rather than spinning up a server; see planned example in `test-plan.md`.
- Mock framework/infrastructure boundaries such as `next-auth` and `@/lib/redis`; see planned example in `test-plan.md`.
- For browser-dependent utilities, mutate `global.navigator` with controlled user-agent values; see planned `getOptimalDRMConfig` tests in `test-plan.md`.
- Verification scripts use a single `async` main function, explicit setup/action/verify/cleanup sections, and `process.exit(1)` on failure: `scripts/verify-auth-sync.ts`.
- Connectivity scripts print diagnostic checkpoints and fail fast when required environment variables are missing: `scripts/verify-azure-storage.ts`, `scripts/verify-axinom-setup.ts`.

## Mocking

**Framework:** Planned Jest mocks; current verification scripts use real external clients.

**Patterns:**
```typescript
// Planned Jest pattern from test-plan.md
jest.mock('next-auth');
jest.mock('@/lib/redis');

(getServerSession as jest.Mock).mockResolvedValue({
  user: { email: 'test@example.com' },
});
```

```typescript
// Planned browser API pattern from test-plan.md
Object.defineProperty(global, 'navigator', {
  value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0' },
  writable: true,
});
```

**What to Mock:**
- Mock authentication/session APIs for unit and route tests: `next-auth`, `getServerSession`, and `authOptions` consumers in `src/app/api/**/route.ts`.
- Mock Redis/cache behavior for code using `src/lib/redis.ts` and middleware/session revocation paths in `src/middleware.ts` and `src/lib/session-revocation.ts`.
- Mock Prisma for unit tests of auth/API logic, or use a dedicated test database for integration tests targeting `src/lib/prisma.ts`.
- Mock browser DRM/media APIs for `src/lib/drm-detection.ts`, `src/hooks/player/useShakaPlayer.ts`, `src/hooks/player/usePlayerFullscreen.ts`, and `src/lib/screen-recording-detection.ts`.
- Mock external network services for tests around `src/lib/axinom-video-service.ts`, `src/lib/axinom-encoding.ts`, `src/lib/azure-storage.ts`, `src/lib/r2.ts`, and `src/lib/email.ts`.

**What NOT to Mock:**
- Do not mock pure transformation/filter/pagination logic when testing hooks such as `src/hooks/admin/useAdminFilters.ts` and `src/hooks/admin/useTablePagination.ts`.
- Do not mock `cn` in `src/lib/utils.ts`; assert merged class output directly.
- Do not mock user-visible rendering for component tests of `src/components/video/Watermark.tsx`, `src/components/course/CourseCard.tsx`, and `src/components/support/SubmitTicketForm.tsx`; mock only their network/session dependencies.
- Do not use production secrets in tests. `jest.setup.ts` intentionally contains mock values only.

## Fixtures and Factories

**Test Data:**
```typescript
// Existing verification-script pattern from scripts/verify-auth-sync.ts
const testEmail = `test-verify-${Date.now()}@example.com`;
const whitelistName = 'Whitelisted Name ' + Date.now();
const initialUserName = 'Google Name ' + Date.now();
```

```typescript
// Planned route-test shape from test-plan.md
const req = new NextRequest('http://localhost/api/session/validate');
const response = await GET(req);
const data = await response.json();
```

**Location:**
- No shared fixture/factory directory exists.
- Put future reusable fixtures under `__tests__/fixtures` or `__tests__/utils` when implementing `test-plan.md`.
- Keep one-off verification data inside `scripts/verify-*.ts` and clean it up in `finally` blocks, as in `scripts/verify-auth-sync.ts`.

## Coverage

**Requirements:** No enforced coverage threshold exists in active config.

Planned targets in `test-plan.md`:
- Security auth/DRM: 90%
- API routes: 80%
- Lib functions: 85%
- Components: 70%
- E2E critical paths: 100% of listed flows

**View Coverage:**
```bash
npm test -- --coverage          # Planned; not runnable until a test script and runner are installed
```

## Test Types

**Unit Tests:**
- Planned scope: security-critical libraries and utilities in `src/lib/auth.ts`, `src/lib/redis.ts`, `src/lib/drm-detection.ts`, `src/lib/email.ts`, `src/lib/azure-storage.ts`, and `src/lib/translations.ts`.
- Use direct function imports and deterministic mocks for browser globals, auth, Redis, Prisma, and external APIs.

**Integration Tests:**
- Planned scope: API route handlers in `src/app/api/**/route.ts`, especially session validation, DRM token/license, admin authorization, whitelist, course/video CRUD, and presigned upload flows.
- Use `NextRequest` and route method imports for handler-level tests, matching `test-plan.md`.
- Current script-level integration checks exercise real systems: `scripts/verify-auth-sync.ts` against Prisma, `scripts/verify-azure-storage.ts` against Azure Blob Storage, and `scripts/verify-axinom-setup.ts` against Axinom.

**E2E Tests:**
- Not used in active configuration.
- Planned framework is Playwright in `test-plan.md`.
- Planned flows include protected-route redirect, admin dashboard access, video playback with watermark, and non-enrolled access denial.

## Common Patterns

**Async Testing:**
```typescript
test('returns valid:true for authenticated user', async () => {
  const req = new NextRequest('http://localhost/api/session/validate');
  const response = await GET(req);
  const data = await response.json();

  expect(data.valid).toBe(true);
});
```

**Error Testing:**
```typescript
test('returns valid:false with 401 for unauthenticated user', async () => {
  (getServerSession as jest.Mock).mockResolvedValue(null);

  const req = new NextRequest('http://localhost/api/session/validate');
  const response = await GET(req);

  expect(response.status).toBe(401);
});
```

**Script Verification:**
```typescript
try {
  // setup, action, verification
} catch (e) {
  console.error('Error during verification:', e);
  process.exit(1);
} finally {
  // cleanup external/database state
}
```

---

*Testing analysis: 2026-05-05*
