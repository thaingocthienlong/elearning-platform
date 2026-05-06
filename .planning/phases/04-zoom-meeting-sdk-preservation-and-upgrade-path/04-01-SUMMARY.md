# 04-01 Summary: Server-Owned Zoom Signature Contract

## Status

Complete.

## What Changed

- `/api/zoom/signature` now validates the NextAuth session before generating a Meeting SDK JWT.
- Meeting number, passcode handling, and role are derived server-side.
- Learners receive role `0`; admins receive role `1`.
- Missing Zoom config fails closed without generating a signature.
- Automated API tests cover unauthenticated denial, missing config, learner/admin roles, server-owned meeting config, watermark lookup, and no SDK secret exposure.

## Verification

- `npm test -- --runTestsByPath __tests__/api/zoom-signature.test.ts` passed.

