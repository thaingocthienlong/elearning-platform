# VdoCipher Urgent Multi-Account Runbook

Use this runbook when Axinom is unavailable and videos must be uploaded to VdoCipher before the paid account is ready. It matches the current app implementation on branch `codex/vdocipher-multi-account`.

Do not paste VdoCipher API secrets, webhook secrets, OTP values, playbackInfo values, cookies, session tokens, full user emails, or raw provider payloads into tickets, screenshots, docs, or chat.

## Official References

- Upload overview: https://www.vdocipher.com/docs/server/upload/overview/
- Upload credentials: https://www.vdocipher.com/docs/server/upload/credentials/
- Browser upload: https://www.vdocipher.com/docs/server/upload/browser/
- Upload file with credentials: https://www.vdocipher.com/docs/server/upload/file/
- OTP API: https://www.vdocipher.com/docs/server/playbackauth/otp/
- OTP TTL: https://www.vdocipher.com/docs/server/playbackauth/ttl
- Player iframe: https://www.vdocipher.com/docs/player/v2/
- Webhooks: https://www.vdocipher.com/docs/server/account/hooks

## What Must Happen Next

1. Create the VdoCipher accounts.
2. Copy each account API secret into the password manager.
3. Add VdoCipher env vars locally and in Vercel.
4. Deploy the branch.
5. Upload videos from `/admin/videos`.
6. Sync each uploaded video until status is ready.
7. Publish only ready videos.
8. Smoke-test learner playback and denied access.
9. Tomorrow, move to the paid account and stop spreading new uploads across free accounts.

## Account Plan For 12 Videos

Use 5 temporary account IDs now:

| Account ID | Env suffix | Suggested use |
|------------|------------|---------------|
| `primary` | `PRIMARY` | First 2-3 videos or highest priority course |
| `backup_1` | `BACKUP_1` | Next 2-3 videos |
| `backup_2` | `BACKUP_2` | Next 2-3 videos |
| `backup_3` | `BACKUP_3` | Next 2-3 videos |
| `backup_4` | `BACKUP_4` | Remaining videos |

Keep a simple upload tracker outside git:

| Local video title | File size | VdoCipher account ID | VdoCipher video ID | Local app video ID | Status | Published |
|-------------------|-----------|----------------------|--------------------|--------------------|--------|-----------|
| | | | | | | |

## Create VdoCipher Accounts

For each free account:

1. Create or sign in to the VdoCipher dashboard.
2. Open the API/settings area.
3. Copy the API secret.
4. Store it in the password manager with the exact logical account ID.
5. Do not store API secrets in spreadsheets, docs, screenshots, or chat.
6. Check available storage/quota before assigning videos.

Use stable labels in the password manager:

```text
Secure Streaming Platform - VdoCipher - primary
Secure Streaming Platform - VdoCipher - backup_1
Secure Streaming Platform - VdoCipher - backup_2
Secure Streaming Platform - VdoCipher - backup_3
Secure Streaming Platform - VdoCipher - backup_4
```

## Add Local Env

Add this to `.env.local` on the machine doing uploads:

```bash
VDOCIPHER_ACCOUNT_IDS=primary,backup_1,backup_2,backup_3,backup_4
VDOCIPHER_DEFAULT_ACCOUNT_ID=primary
VDOCIPHER_API_SECRET_PRIMARY=<secret from primary account>
VDOCIPHER_API_SECRET_BACKUP_1=<secret from backup_1 account>
VDOCIPHER_API_SECRET_BACKUP_2=<secret from backup_2 account>
VDOCIPHER_API_SECRET_BACKUP_3=<secret from backup_3 account>
VDOCIPHER_API_SECRET_BACKUP_4=<secret from backup_4 account>
VDOCIPHER_WEBHOOK_SECRET=<random long secret>
```

Rules:

- `VDOCIPHER_ACCOUNT_IDS` controls which accounts admin can select.
- `VDOCIPHER_DEFAULT_ACCOUNT_ID` is used when admin does not choose one.
- Each account must have one matching `VDOCIPHER_API_SECRET_<SUFFIX>`.
- Suffix is uppercase and non-alphanumeric characters become `_`.
- Example: `backup-1`, `backup_1`, and `backup 1` all normalize to `BACKUP_1`; avoid duplicates.

Validate local config:

```bash
npm run verify:services
```

Expected:

- It should print `OK VdoCipher` when every configured account has a secret.
- If it prints `SKIP VdoCipher`, upload/playback through VdoCipher is not ready in that environment.

## Add Vercel Env

In Vercel project settings, add the same variables to the active Preview/Staging/Production environment:

```bash
VDOCIPHER_ACCOUNT_IDS
VDOCIPHER_DEFAULT_ACCOUNT_ID
VDOCIPHER_API_SECRET_PRIMARY
VDOCIPHER_API_SECRET_BACKUP_1
VDOCIPHER_API_SECRET_BACKUP_2
VDOCIPHER_API_SECRET_BACKUP_3
VDOCIPHER_API_SECRET_BACKUP_4
VDOCIPHER_WEBHOOK_SECRET
```

Then redeploy the app. Env changes do not affect an already-running deployment until redeploy.

After deploy, check:

```bash
npm run verify:services:strict
```

If strict verification is run locally without staging secrets, it may fail. That is expected. The real requirement is that the deployed environment has all VdoCipher secrets configured.

## Configure Webhook

If VdoCipher webhook setup is available in the account dashboard, configure each account with:

```text
https://<your-domain>/api/webhook/vdocipher?secret=<VDOCIPHER_WEBHOOK_SECRET>
```

Notes:

- Use the same secret value as `VDOCIPHER_WEBHOOK_SECRET`.
- Webhook is helpful but not mandatory for urgent upload because admin sync exists.
- Never expose the webhook URL with real secret in screenshots.

## Upload Videos

1. Sign in as admin.
2. Open `/admin/videos`.
3. Choose or create the course/lesson metadata as normal.
4. Set provider to `VdoCipher`.
5. Choose the account ID with enough quota.
6. Select the video file.
7. Start upload.
8. Wait for upload completion.
9. Record account ID, VdoCipher video ID, and local app video ID in the tracker.

What the app does:

- Server calls VdoCipher `PUT /api/videos?title=<title>`.
- Server uses `Authorization: Apisecret <secret>`.
- Browser receives only temporary upload credentials.
- Browser uploads file to `clientPayload.uploadLink`.
- Local `Video` row is stored with provider `VDOCIPHER`, account ID, VdoCipher video ID, and `PRE_UPLOAD` status.

## Sync And Publish

After each upload:

1. Stay on `/admin/videos`.
2. Click sync for the uploaded VdoCipher video.
3. Repeat sync until VdoCipher status is ready.
4. If status is error, check VdoCipher dashboard for that account.
5. Publish only after status is ready.

Do not publish while status is:

- `PRE_UPLOAD`
- `QUEUED`
- `PROCESSING`
- `ERROR`

## Playback Smoke Test

For every published VdoCipher video:

1. Sign in as a learner with access to the course/video.
2. Open `/watch/<local-video-id>`.
3. Accept IPR consent.
4. Confirm VdoCipher iframe loads and video starts.
5. Confirm watermark shell is visible.
6. Refresh if the page waited too long before consent; OTP TTL is currently 300 seconds.

What the app does:

- Server checks existing course/video entitlement first.
- Server calls VdoCipher OTP API with `ttl: 300`.
- VdoCipher returns `otp` and `playbackInfo`.
- Player iframe loads `https://player.vdocipher.com/v2/?otp=...&playbackInfo=...`.

## Denied Access Smoke Test

1. Sign in as a learner without access.
2. Open `/watch/<local-video-id>`.
3. Confirm access is denied.
4. Directly request `/api/vdocipher/otp` for that video only in a safe test tool.
5. Confirm no OTP or playbackInfo is returned.

Do not copy returned OTP/playbackInfo values into evidence.

## Troubleshooting

### `SKIP VdoCipher: missing VDOCIPHER_API_SECRET_PRIMARY`

The env var is missing for the default account. Add `VDOCIPHER_API_SECRET_PRIMARY` or change `VDOCIPHER_DEFAULT_ACCOUNT_ID` to an account that has a secret.

### Admin account selector is missing accounts

Check `VDOCIPHER_ACCOUNT_IDS`. It must be comma-separated:

```bash
VDOCIPHER_ACCOUNT_IDS=primary,backup_1,backup_2,backup_3,backup_4
```

Restart local dev server or redeploy after changing env.

### Duplicate account error

Two IDs normalize to the same suffix. For example, `backup-1` and `backup_1` both become `BACKUP_1`. Keep only one.

### Upload created video but file did not finish

The local app may show a `PRE_UPLOAD` video row. Retry upload if safe, or delete/replace that local video row from admin after confirming no usable upload exists in VdoCipher.

### Video uploaded but not playable

Check:

1. VdoCipher dashboard says video is ready.
2. Admin sync updated local status to ready.
3. Video is published.
4. Learner has course/video access.
5. Correct account secret is still configured for the stored account ID.

### OTP expired before user clicked play

Refresh the watch page. Current OTP TTL is 300 seconds. This is deliberate for short-lived playback auth.

## Tomorrow Paid Account Cleanup

After paid account is ready:

1. Add paid account as a new ID, for example `paid`.
2. Add `VDOCIPHER_API_SECRET_PAID`.
3. Change `VDOCIPHER_DEFAULT_ACCOUNT_ID=paid`.
4. Keep old free-account secrets active until old videos are migrated or no longer needed.
5. Upload all new videos to `paid`.
6. For any video moved between accounts, update the local record with the new account ID and VdoCipher video ID.
7. After confirming no video uses free accounts, remove old free IDs from `VDOCIPHER_ACCOUNT_IDS`.

Recommended paid-account env:

```bash
VDOCIPHER_ACCOUNT_IDS=paid,primary,backup_1,backup_2,backup_3,backup_4
VDOCIPHER_DEFAULT_ACCOUNT_ID=paid
VDOCIPHER_API_SECRET_PAID=<paid account secret>
```

Keep old account secrets until all old videos are either migrated or archived.

## Minimum Acceptance Checklist

Before telling clients videos are ready:

- [ ] Deployed app has VdoCipher env vars.
- [ ] Admin account list shows all intended accounts.
- [ ] All 12 videos uploaded.
- [ ] Each video has account ID and VdoCipher video ID recorded.
- [ ] Each video status is ready.
- [ ] Each video is published in the correct course.
- [ ] One entitled learner playback test passes per course.
- [ ] One denied learner test confirms no playback.
- [ ] No evidence contains secrets, OTP, playbackInfo, or raw provider payloads.
