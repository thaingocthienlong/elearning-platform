# Plan: Switch Zoom Display Name to Whitelist Source

## Goal

Ensure the Display Name used in Zoom meetings (and elsewhere in the app) matches the name defined in the "White List" (`AllowedEmail` table), rather than the name provided by Google Auth.

## Investigation Findings

- **Current Source**: Google Auth Profile -> `User` table -> NextAuth Session -> Zoom URL.
- **Desired Source**: `AllowedEmail` table (`fullname` column).
- **Schema Status**: `AllowedEmail` table already exists and has a `fullname` column.

## Proposed Changes

### 1. Update Authentication Logic (`src/lib/auth.ts`)

- **Location**: `callbacks.signIn` function.
- **Logic Change**:
  - When a user signs in (or re-authenticates), fetch the corresponding record from `AllowedEmail`.
  - If `AllowedEmail` record exists and has a `fullname`:
    - Update the `User` record's `name` to match `AllowedEmail.fullname`.
  - This ensures the `User` table serves as the single source of truth for the session, but it is synchronized with the Whitelist configuration.

**Pseudo-code:**

```typescript
// Inside signIn callback
const [existingUser, whitelisted] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.allowedEmail.findUnique({ where: { email } }),
]);

// ... existing checks ...

// If whitelisted and allowed:
if (whitelisted && whitelisted.fullname) {
    if (existingUser && existingUser.name !== whitelisted.fullname) {
         await prisma.user.update({
            where: { email },
            data: { name: whitelisted.fullname }
        });
    }
}
```

### 2. Verify Session Propagation

- Since the `User` table is updated *before* the session is fully established/refreshed (or concurrent with it), the next read of the session should reflect the new name.
- Standard `session` callback in `auth.ts` already maps `user` fields to the session, so no changes needed there if `User` table is updated.

## Verification Plan

### Automated Verification

- **Script**: Create a test script `scripts/verify-auth-sync.ts` (using `ts-node` or similar if available, or just a mock in existing framework).
- **Test Case**:
    1. Create a dummy `AllowedEmail` entry with a specific `fullname` (e.g., "Whitelisted Name").
    2. Create/Update a dummy `User` entry with a different name (e.g., "Google Name").
    3. Run a function simulating the `signIn` logic.
    4. Assert that `User` entry's name updates to "Whitelisted Name".

### Manual Verification

1. **Prerequisites**: Access to the database (via script or UI).
2. **Steps**:
    - Identify a test email.
    - Update its `AllowedEmail` entry with a distinct name (e.g., "TEST USER FROM WHITELIST").
    - Sign out and Sign in with Google with that email.
    - Join a Zoom meeting.
    - **Expectation**: Zoom participant name should be "TEST USER FROM WHITELIST".

## Rollback Plan

- Revert changes to `src/lib/auth.ts`.
