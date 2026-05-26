# Changelog

All notable changes to the "Secure Video Platform" project will be documented in this file.

## [Unreleased]

## [0.2.0] - 2026-01-16

### Added

- **Redis Optimization (Phase 3)**:
  - Middleware rate limiting exemptions for internal high-frequency endpoints (`/api/session/validate`, `/api/watch/heartbeat`).
  - Client-side session validity caching in `useSessionSSE` hook.
  - Efficient Redis usage in `api/session/validate` (replaced fetcher pattern with direct cache check).
- **Admin Dashboard (Phase 2 Refactoring)**:
  - Shared hooks for admin pages: `useAdminData`, `useAdminFilters`, `useTablePagination`.
  - Refactored `admin/whitelist`, `admin/videos`, `admin/users`, `admin/views` to use shared hooks.
- **Documentation**:
  - Added `docs/architecture/system_overview.md`.
  - Added `docs/api/endpoints.md`.

### Changed

- **Performance**:
  - Increased video heartbeat interval from 30s to 60s to reduce database/log write load.
  - Stabilized `useAdminData` callbacks to prevent infinite re-render loops.
- **Bug Fixes**:
  - Fixed `UserMenu` hook order violation ("Rules of Hooks").
  - Fixed `chartData.slice` error in Analytics page by calculating `viewsOverTime` in API.
  - Fixed `useTablePagination` reset logic when filtering.

### Removed

- Removed unsafe `.env` files from Git tracking.
- Removed duplicate hook calls in `UserMenu`.

## [0.1.0] - 2026-01-01

- Initial release of Secure Video Platform.
