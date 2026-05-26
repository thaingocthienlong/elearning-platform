# Secure Video Platform - Test Plan

## Overview

Comprehensive test strategy for the secure-video-platform covering unit, integration, and E2E testing.

**Tech Stack:** Next.js 16, Prisma (MongoDB), NextAuth, Shaka Player, Axinom DRM, Redis, Zoom SDK

---

## 1. Test Infrastructure Setup

### Required Packages

```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
npm install -D msw@latest      # API mocking
npm install -D @playwright/test # E2E testing
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
```

### Environment Variables for Testing

```typescript
// jest.setup.ts (sanitized - NO production secrets)
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
process.env.AUTH_SECRET = 'test-auth-secret-32-chars-minimum';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test_db';
```

---

## 2. Unit Tests

### Priority 1: Security-Critical Functions

| File | Function | Test Cases |
|------|----------|------------|
| `lib/auth.ts` | `signIn` callback | Whitelist validation, soft-delete restore, block non-whitelisted |
| `lib/redis.ts` | `getCached`, `setCache` | Cache hit/miss, TTL expiry, error handling |
| `lib/drm-detection.ts` | `detectDRMCapabilities` | Browser detection, DRM system detection |
| `lib/drm-detection.ts` | `getOptimalDRMConfig` | iOS→FairPlay, Edge→PlayReady, Chrome→Widevine |

### Priority 2: Utility Functions

| File | Function | Test Cases |
|------|----------|------------|
| `lib/email.ts` | Email sending | Template rendering, SMTP errors |
| `lib/azure-storage.ts` | SAS URL generation | Valid URLs, expiry handling |
| `lib/translations.ts` | Translation lookup | Key exists, fallback language |

### Example Test: DRM Detection

```typescript
// __tests__/lib/drm-detection.test.ts
import { getOptimalDRMConfig, getBrowserInfo } from '@/lib/drm-detection';

describe('getOptimalDRMConfig', () => {
  const originalNavigator = global.navigator;
  
  beforeEach(() => {
    // Reset navigator mock
  });

  test('returns FairPlay config for Safari on iOS', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) Safari/605.1.15' },
      writable: true,
    });
    
    const config = getOptimalDRMConfig(null, 'https://example.com/manifest.m3u8');
    
    expect(config?.drmType).toBe('fairplay');
    expect(config?.protocol).toBe('HLS');
  });

  test('returns Widevine config for Chrome on Windows', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0' },
      writable: true,
    });
    
    const config = getOptimalDRMConfig('https://example.com/manifest.mpd', null);
    
    expect(config?.drmType).toBe('widevine');
    expect(config?.protocol).toBe('DASH');
  });

  test('returns PlayReady config for Edge', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Edg/120.0.0.0' },
      writable: true,
    });
    
    const config = getOptimalDRMConfig('https://example.com/manifest.mpd', null);
    
    expect(config?.drmType).toBe('playready');
  });

  test('returns null when required manifest unavailable', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) Safari/605.1.15' },
      writable: true,
    });
    
    const config = getOptimalDRMConfig('https://example.com/manifest.mpd', null);
    
    expect(config).toBeNull();
  });
});
```

---

## 3. API Integration Tests

### Priority 1: Authentication & Authorization

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/auth/[...nextauth]` | POST | Login flow, session creation |
| `/api/session/validate` | GET | Valid session, expired session, no session |
| `/api/admin/*` | ALL | Admin role required, reject non-admin |

### Priority 2: DRM & Video

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/drm/token` | POST | Generate valid JWT, require auth |
| `/api/drm/license` | POST | Check entitlement, return keys |
| `/api/watch/heartbeat` | POST | Update watch progress, view counting |

### Priority 3: Admin Operations

| Endpoint | Method | Test Cases |
|----------|--------|------------|
| `/api/admin/users` | GET | List users, admin only |
| `/api/admin/whitelist` | POST/DELETE | Add/remove allowed emails |
| `/api/admin/courses` | CRUD | Create, update, delete courses |
| `/api/upload/presigned` | POST | Generate upload URL, admin only |

### Example Test: Session Validation API

```typescript
// __tests__/api/session/validate.test.ts
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

  test('returns valid:false with 401 for unauthenticated user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/session/validate');
    const response = await GET(req);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.valid).toBe(false);
  });
});
```

---

## 4. Component Tests

### Priority 1: Video Components

| Component | Test Cases |
|-----------|------------|
| `Player.tsx` | Renders video element, handles DRM config, shows watermark |
| `Watermark.tsx` | Displays user info, positions correctly, responsive sizing |
| `DRMPlayerWrapper.tsx` | Detects DRM, falls back gracefully |

### Priority 2: Auth & Layout

| Component | Test Cases |
|-----------|------------|
| `Providers.tsx` | Wraps children with session provider |
| `UserMenu.tsx` | Shows user name, logout button works |
| `Navbar.tsx` | Renders navigation links, admin links for admins only |

---

## 5. E2E Tests (Playwright)

### Critical User Flows

#### Authentication Flow

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects to signin when accessing protected page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*signin/);
  });

  test('shows admin dashboard after login for admin user', async ({ page }) => {
    // Setup: Login via stored auth state
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Admin');
  });
});
```

#### Video Playback Flow

```typescript
// e2e/video-playback.spec.ts
test.describe('Video Playback', () => {
  test.beforeEach(async ({ page }) => {
    // Login as enrolled user
  });

  test('plays video with watermark visible', async ({ page }) => {
    await page.goto('/watch/video-id-123');
    
    // Wait for player to load
    await page.waitForSelector('video');
    
    // Check watermark is visible
    const watermark = page.locator('[data-testid="watermark"]');
    await expect(watermark).toBeVisible();
  });

  test('blocks access for non-enrolled user', async ({ page }) => {
    await page.goto('/watch/video-id-not-enrolled');
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });
});
```

---

## 6. Test Coverage Goals

| Category | Target Coverage | Priority |
|----------|----------------|----------|
| Security (auth, DRM) | 90% | P0 |
| API Routes | 80% | P1 |
| Lib Functions | 85% | P1 |
| Components | 70% | P2 |
| E2E Critical Paths | 100% of flows | P1 |

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Set up Jest + Testing Library
- [ ] Configure MSW for API mocking
- [ ] Create test utilities and fixtures
- [ ] Write tests for `lib/drm-detection.ts`
- [ ] Write tests for `lib/redis.ts`

### Phase 2: API Tests (Week 2)

- [ ] Test `/api/session/validate`
- [ ] Test `/api/drm/token`
- [ ] Test `/api/admin/*` authorization
- [ ] Test `/api/upload/presigned`

### Phase 3: Component Tests (Week 3)

- [ ] Test `Player.tsx` rendering
- [ ] Test `Watermark.tsx` display
- [ ] Test navigation components

### Phase 4: E2E Tests (Week 4)

- [ ] Set up Playwright
- [ ] Auth flow E2E
- [ ] Video playback E2E
- [ ] Admin operations E2E

---

## 8. CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx prisma generate
      - run: npm test -- --coverage
      
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
```

---

## Quick Start Commands

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- drm-detection.test.ts

# Run E2E tests
npx playwright test

# Run E2E tests with UI
npx playwright test --ui
```
