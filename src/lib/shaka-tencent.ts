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
  request: { headers: Record<string, string>; uris?: string[] };
  drmToken?: string;
}) {
  if (options.requestType !== options.licenseRequestType || !options.drmToken) return;

  options.request.uris = (options.request.uris ?? []).map((uri) => {
    const separator = uri.includes('?') ? '&' : '?';
    return `${uri}${separator}drmToken=${encodeURIComponent(options.drmToken!)}`;
  });
}
