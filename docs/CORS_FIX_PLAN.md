# Plan: Fix Video Upload CORS Error

## Problem

Video uploads/playback are failing with a CORS error:
`No 'Access-Control-Allow-Origin' header is present on the requested resource`
Origin: `https://elearning.vienphuongnam.com.vn`

## Analysis

- **Source**: `src/lib/azure-storage.ts` generates SAS URLs for direct browser access.
- **Config**: Azure Blob Storage requires explicit CORS rules to allow cross-origin requests.
- **Current Script**: `scripts/fix-azure-cors.ts` exists but:
    1. **Missing Origin**: Does not include `https://elearning.vienphuongnam.com.vn`.
    2. **Env Var Mismatch**: Uses `AX_BLOB_ACCOUNT` instead of `AZURE_STORAGE_ACCOUNT` (which is used in `src/lib/azure-storage.ts`).

## Proposed Changes

### 1. Update `scripts/fix-azure-cors.ts`

- **Env Vars**: Switch to `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY` to match production code.
- **Allowed Origins**: Add:
  - `https://elearning.vienphuongnam.com.vn`
  - `https://www.elearning.vienphuongnam.com.vn`

### 2. Execution

- Run `npx tsx scripts/fix-azure-cors.ts` to apply the new rules to the Azure Storage account.
- This will update the Service Properties on Azure.

## Verification

- The script itself includes a verification step that reads back the properties.
- **Manual Verification**: User should try to reload the page/video after ~1 minute (propagation time).

## Rollback

- If the script fails, check `.env` values.
- If it breaks other domains, re-run with original domains.
