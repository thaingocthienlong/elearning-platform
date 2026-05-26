import crypto from 'crypto';
import type { DrmType } from './types';

type DoveRunnerPolicy = {
  policy_version: 2;
  playback_policy?: {
    persistent?: boolean;
    license_duration?: number;
    expire_date?: string;
    rental_duration?: number;
    playback_duration?: number;
    renewal_duration?: number;
    allowed_track_types?: 'ALL' | 'SD_ONLY' | 'SD_HD' | 'SD_UHD1' | 'SD_UHD2';
  };
};

type BuildTokenInput = {
  siteId: string;
  siteAccessKey: string;
  contentId: string;
  userId: string;
  drmType: DrmType;
  ttlSeconds: number;
  now?: Date;
  iv?: Buffer;
};

function toDoveRunnerTimestamp(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function keyFromAccessKey(siteAccessKey: string) {
  return crypto.createHash('sha256').update(siteAccessKey).digest();
}

export function encryptDoveRunnerPolicy(
  policy: DoveRunnerPolicy,
  siteAccessKey: string,
  iv = crypto.randomBytes(16)
) {
  const cipher = crypto.createCipheriv('aes-256-cbc', keyFromAccessKey(siteAccessKey), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(policy), 'utf8'),
    cipher.final(),
  ]);

  return Buffer.concat([iv, encrypted]).toString('base64');
}

export function buildDoveRunnerTokenPayload({
  siteId,
  siteAccessKey,
  contentId,
  userId,
  drmType,
  ttlSeconds,
  now = new Date(),
  iv,
}: BuildTokenInput) {
  const timestamp = toDoveRunnerTimestamp(now);
  const policy = encryptDoveRunnerPolicy(
    {
      policy_version: 2,
      playback_policy: {
        persistent: false,
        license_duration: ttlSeconds,
      },
    },
    siteAccessKey,
    iv
  );
  const hash = crypto
    .createHash('sha256')
    .update(siteAccessKey + drmType + siteId + userId + contentId + policy + timestamp)
    .digest('base64');

  return {
    drm_type: drmType,
    site_id: siteId,
    user_id: userId,
    cid: contentId,
    policy,
    timestamp,
    hash,
  };
}

export function generateDoveRunnerLicenseToken(input: BuildTokenInput) {
  return Buffer.from(JSON.stringify(buildDoveRunnerTokenPayload(input)), 'utf8').toString('base64');
}
