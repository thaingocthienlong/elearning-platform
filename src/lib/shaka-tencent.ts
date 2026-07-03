import type { TencentDrmType } from './tencent/types';

export function resolveTencentShakaLicenseServerUrl(
  drmType: TencentDrmType | undefined,
  env: {
    widevineLicenseUrl?: string;
    fairplayLicenseUrl?: string;
  } = {
    widevineLicenseUrl: process.env.NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL,
    fairplayLicenseUrl: process.env.NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL,
  }
) {
  if (drmType === 'fairplay') return env.fairplayLicenseUrl;
  return env.widevineLicenseUrl;
}

export function applyTencentLicenseRequest(options: {
  requestType: number;
  licenseRequestType: number;
  request: { headers: Record<string, string> };
  drmToken?: string;
}) {
  if (options.requestType !== options.licenseRequestType || !options.drmToken) return;
  options.request.headers['DrmToken'] = options.drmToken;
}
