import type { DrmType } from './media-provider/types';

const DOVERUNNER_LICENSE_URL_DEFAULT = 'https://drm-license.doverunner.com/ri/licenseManager.do';

type Env = Record<string, string | undefined>;

export function resolveDoveRunnerLicenseServerUrl(
  _drmType: DrmType | undefined,
  env: Env = process.env,
  fallbackUrl?: string
) {
  return env.NEXT_PUBLIC_DOVERUNNER_LICENSE_URL?.trim() || fallbackUrl || DOVERUNNER_LICENSE_URL_DEFAULT;
}

type ShakaRequest = {
  headers: Record<string, string>;
};

export function shouldAttachLicenseToken(
  requestType: number,
  licenseRequestType: number,
  token?: string
) {
  return Boolean(token) && requestType === licenseRequestType;
}

export function attachDoveRunnerLicenseTokenHeader(request: ShakaRequest, token: string) {
  request.headers['pallycon-customdata-v2'] = token;
}
