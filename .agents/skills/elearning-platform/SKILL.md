```markdown
# elearning-platform Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns of the `elearning-platform` repository, a TypeScript-based Next.js application. You'll learn the project's coding conventions, commit practices, testing strategies, and the main workflows for implementing features, fixing bugs, and updating documentation. The guide includes actionable commands and code examples to streamline your contributions.

## Coding Conventions

### File Naming
- Use **kebab-case** for all file and folder names.
  - Example: `safari-fairplay-readiness.ts`, `use-shaka-player.ts`

### Import Style
- Use **alias imports** for internal modules.
  - Example:
    ```typescript
    import { detectDRM } from '@/lib/drm-detection';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // src/lib/drm-detection.ts
    export function detectDRM() { ... }
    ```

### Commit Messages
- Follow **conventional commit** format.
- Prefixes: `fix`, `docs`, `test`, `feat`
- Keep messages concise (~38 characters).
  - Example:
    ```
    feat: add FairPlay DRM detection logic
    fix: correct player hook DRM fallback
    ```

## Workflows

### Feature or Bugfix with Tests
**Trigger:** When adding a new feature or fixing a bug and ensuring it is tested  
**Command:** `/feature-with-tests`

1. Edit or create implementation file(s) in `src/` or `scripts/`.
   - Example: `src/lib/safari-fairplay-readiness.ts`
2. Edit or create corresponding test file(s) in `__tests__/`.
   - Example: `__tests__/lib/safari-fairplay-readiness.test.ts`
3. Commit both implementation and test changes together.
   - Example commit:
     ```
     feat: support FairPlay readiness check
     ```
4. Push and open a pull request for review.

**Code Example:**
```typescript
// src/lib/drm-detection.ts
export function detectDRM() {
  // DRM detection logic
}

// __tests__/lib/drm-detection.test.ts
import { detectDRM } from '@/lib/drm-detection';

test('detectDRM returns expected result', () => {
  expect(detectDRM()).toBe(/* expected value */);
});
```

---

### Documentation Update with Checklists
**Trigger:** When updating or adding documentation, validation plans, or checklists  
**Command:** `/update-docs`

1. Edit or create markdown documentation files in `docs/`.
   - Example: `docs/axinom-staging-checklist.md`
2. Optionally, update or add related test files in `__tests__/docs/`.
   - Example: `__tests__/docs/staging-docs.test.ts`
3. Commit documentation and test changes together.
   - Example commit:
     ```
     docs: update staging checklist for FairPlay
     ```
4. Push and open a pull request for review.

**Code Example:**
```markdown
<!-- docs/staging-smoke-checklist.md -->
# Staging Smoke Checklist

- [x] DRM detection tested
- [x] Player loads content
```

```typescript
// __tests__/docs/staging-docs.test.ts
test('Staging checklist is up to date', () => {
  // Validation logic for checklist
});
```

## Testing Patterns

- **Framework:** Jest
- **Test Files:** Use `.test.ts` suffix
  - Example: `safari-fairplay-readiness.test.ts`
- **Location:** Place tests in `__tests__/` directory, mirroring source structure.
- **Test Example:**
  ```typescript
  // __tests__/lib/fairplay-key-system.test.ts
  import { getFairPlayKeySystem } from '@/lib/fairplay-key-system';

  test('returns correct key system string', () => {
    expect(getFairPlayKeySystem()).toBe('com.apple.fps.1_0');
  });
  ```

## Commands

| Command             | Purpose                                                      |
|---------------------|--------------------------------------------------------------|
| /feature-with-tests | Start a feature or bugfix implementation with tests          |
| /update-docs        | Update documentation, checklists, or validation plans        |
```
