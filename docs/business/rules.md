# Business Rules & Logic

## 1. Authentication & Session

- **Concurrency**: A user can only watch videos on **one device** at a time.
  - *Implementation*: Browser fingerprinting + Redis session tracking.
  - *Action*: Logging in on Device B pushes a revocation signal to Device A via SSE.
- **Session Timeout**: Sessions are checked every **5 minutes** (fallback polling) or real-time (SSE).
- **Access Control**: Only users in the `AllowedEmail` whitelist or Admins can register/login.

## 2. Video Playback

- **Heartbeat**: Playback progress is saved every **60 seconds**.
- **View Counting**: A "view" is incremented only if the user watches > X% (configurable, default logic exists).
- **DRM**:
  - Widevine (Chrome/Firefox/Edge)
  - PlayReady (Edge/Windows)
  - FairPlay (Safari/macOS - requires Certificate)
- **Watermark**: Displays user email + unique session ID + IP (optional) to deter screen capture.

## 3. Admin Permissions

- **Role 'ADMIN'**: Full access to dashboard.
- **Role 'USER'**: Read-only access to courses/videos.
- **Deletion**: Soft-delete is preferred (setting `isDeleted: true`) over hard database deletes for Audit trail.
