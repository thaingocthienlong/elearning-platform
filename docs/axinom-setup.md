# Axinom DRM And Encoding Setup

This guide maps official Axinom Mosaic setup concepts to this repo. It uses placeholder names only. Put real tenant values in `.env.local` or staging encrypted env settings, never in docs or commits.

## Official Sources

- Axinom DRM License Service: https://docs.axinom.com/services/drm/license-service
- Signing License Service Messages: https://docs.axinom.com/services/drm/license-service/sign-license-service-message
- Axinom Shaka Player integration: https://docs.axinom.com/services/drm/players/shaka
- Axinom Encoding API: https://docs.axinom.com/services/encoding/encoding-api/
- Axinom DRM quick start encoding guide: https://docs.axinom.com/services/drm/quickstart/encode
- Encoding credentials protection: https://docs.axinom.com/services/encoding/encoding-service/credentials-protection
- Axinom webhooks: https://docs.axinom.com/concepts/webhooks/

## Repo Integration Model

This app uses Axinom DRM standard mode.

1. The user opens a protected watch page.
2. The server checks media entitlement.
3. The server signs an Axinom License Service Message JWT using the Axinom DRM Communication Key.
4. Shaka Player loads the DASH/HLS manifest.
5. Shaka sends the JWT as `X-AxDRM-Message` only on DRM license requests to Axinom License Service.
6. Axinom License Service issues the DRM license if the License Service Message authorizes the requested key ID.

The repo does not use local proxy mode for v1. `/api/drm/license` is not the production Axinom License Service.

## DRM Portal Values

In My Mosaic / DRM, collect:

| Axinom value | Repo env var | Notes |
|--------------|--------------|-------|
| Communication Key ID | `AXINOM_COM_KEY_ID` | Identifier included in the License Service Message as `com_key_id`. |
| Communication Key value | `AXINOM_COM_KEY_SECRET` | Base64 value used server-side to sign HS256 JWTs. Never expose to the browser. |
| Widevine License Service URL | `NEXT_PUBLIC_AX_WV_LS_URL` | Public browser config. Use the tenant-dedicated URL if Axinom provides one. |
| PlayReady License Service URL | `NEXT_PUBLIC_AX_PR_LS_URL` | Public browser config. |
| FairPlay License Service URL | `NEXT_PUBLIC_AX_FP_LS_URL` | Public browser config required only when FairPlay playback is configured. FairPlay also needs a certificate URL. |
| FairPlay certificate URL | `AXINOM_FAIRPLAY_CERT_URL` | Server-side source for `/api/drm/fairplay-cert`. Apple FPS credentials are owner-specific; leave unset when using clear HLS fallback for Apple browsers. |

Axinom documents generic license URLs:

- Widevine: `https://drm-widevine-licensing.axprod.net/AcquireLicense`
- PlayReady: `https://drm-playready-licensing.axprod.net/AcquireLicense`
- FairPlay: `https://drm-fairplay-licensing.axprod.net/AcquireLicense`

Use tenant-dedicated URLs when your Axinom tenant provides them because they improve tracking and support diagnostics.

## License Service Message Rules

Axinom's signing docs show a License Service Message wrapper:

- `version: 1`
- `com_key_id: <Communication Key ID>`
- `message: <Entitlement Message>`

The Entitlement Message should include:

- `type: "entitlement_message"`
- `version: 2`
- short validity through `license.expiration_datetime` or equivalent license restrictions
- `content_keys_source.inline[]` entries for only the authorized key IDs
- optional session/user identifiers for audit and billing attribution

The Communication Key value is base64 and must be decoded before HS256 signing. Keep this signing server-only.

## Encoding Trial Setup

For a first trial tenant, use Axinom's UI-first flow before relying on API automation.

1. Open My Mosaic and the Mosaic Management System URL for your tenant.
2. Create or connect input storage for source video files.
3. Create or connect output storage for encoded DASH/HLS assets.
4. Configure an Acquisition Profile for input storage.
5. Configure a Publishing Profile for output storage.
6. Configure a DRM Processing Profile for protected output.
7. Configure a clear Processing Profile if FairPlay/FPS is not available and Apple-browser playback is still required.
8. Upload one test video to input storage.
9. Start encoding and wait for completion.
10. Preview the encoded output in Axinom tools before connecting it to this app.

For production-like Encoding API requests, Axinom recommends encrypted credentials protection for storage, message publisher, and DRM secret material. Use Axinom's Credentials Protection Tool or the documented certificate-based encryption process before passing storage secrets to Encoding.

## Encoding Service Account Values

Create a Mosaic service account with Encoding permission. Record:

| Axinom value | Repo env var | Notes |
|--------------|--------------|-------|
| Service account client ID | `AXINOM_ENCODING_CLIENT_ID` | Used by `src/lib/axinom-video-service.ts`. |
| Service account client secret | `AXINOM_ENCODING_CLIENT_SECRET` | Server secret. |
| DRM processing profile ID | `AXINOM_ENCODING_PROFILE_DRM` | Used for protected output. |
| Clear processing profile ID | `AXINOM_ENCODING_PROFILE_CLEAR` | Required for new admin video processing so Safari/iOS have the clear HLS fallback path. |

## Apple Browser Fallback Without FairPlay

Axinom and Shaka both require a FairPlay server certificate for FairPlay DRM playback. If the tenant does not have Apple FPS/FairPlay credentials, do not configure FairPlay in the player path.

This repo supports the older fallback pattern:

1. Keep `AXINOM_FAIRPLAY_CERT_URL` unset.
2. Configure `AXINOM_ENCODING_PROFILE_CLEAR`.
3. Let the admin processing route create both the DRM encode and the clear encode.
4. Confirm sync/webhook populates `hlsUrlClear`.
5. Safari and iOS use `hlsUrlClear` without a DRM token; other supported browsers keep using DASH with Widevine or PlayReady.

Clear HLS is not DRM. Use it only as an intentional compatibility fallback with server-side entitlement, HLS route authorization, watermarking, session controls, and audit telemetry.
| Encoding API base URL | `AXINOM_ENCODING_API_URL` | Default examples use `https://vip-eu-west-1.axinom.com`. |
| Video Service GraphQL URL | `AXINOM_VIDEO_SERVICE_URL` | Default examples use `https://video.service.eu.axinom.net/graphql`. |

Legacy aliases such as `AX_CLIENT_ID`, `AX_CLIENT_SECRET`, `AX_PROFILE_ID`, and `AX_ENCODING_BASE` are local compatibility only. Staging should use canonical `AXINOM_*` variables.

## Webhook Setup

Configure an Axinom webhook that points to:

```text
https://<staging-domain>/api/webhook/axinom
```

Set the shared secret in staging as:

```text
AXINOM_WEBHOOK_SECRET=<staging-webhook-secret>
```

The route verifies `x-mosaic-signature` and updates video metadata when encoding finishes. Phase 3 stores Axinom operational IDs and statuses in explicit video fields instead of relying on user-facing descriptions.

## Local Verification

Local validation does not call live Axinom APIs by default:

```bash
npx tsx scripts/verify-axinom-setup.ts
```

Strict staging-style validation fails missing canonical variables:

```bash
npx tsx scripts/verify-axinom-setup.ts --strict
```

Live tenant checks are opt-in:

```bash
npx tsx scripts/verify-axinom-setup.ts --strict --live
```

Run live checks only after real tenant credentials, profile IDs, storage, and webhook values are configured.
