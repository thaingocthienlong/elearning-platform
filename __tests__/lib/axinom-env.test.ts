import {
  AXINOM_LICENSE_URL_DEFAULTS,
  validateAxinomEnv,
} from '@/lib/axinom-env';

describe('validateAxinomEnv', () => {
  test('local mode accepts missing credentials with warnings-free skip semantics', () => {
    const result = validateAxinomEnv({}, 'local');

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.values.widevineLicenseUrl).toBe(AXINOM_LICENSE_URL_DEFAULTS.widevine);
    expect(result.values.playreadyLicenseUrl).toBe(AXINOM_LICENSE_URL_DEFAULTS.playready);
    expect(result.values.fairplayLicenseUrl).toBe(AXINOM_LICENSE_URL_DEFAULTS.fairplay);
  });

  test('strict mode fails missing canonical staging values', () => {
    const result = validateAxinomEnv({}, 'strict');

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('AXINOM_COM_KEY_ID'),
        expect.stringContaining('AXINOM_COM_KEY_SECRET'),
        expect.stringContaining('AXINOM_ENCODING_CLIENT_ID'),
        expect.stringContaining('AXINOM_ENCODING_PROFILE_CLEAR'),
      ])
    );
  });

  test('local mode temporarily resolves legacy aliases with warnings', () => {
    const result = validateAxinomEnv(
      {
        AX_CLIENT_ID: 'legacy-client',
        AX_CLIENT_SECRET: 'legacy-secret',
        AX_PROFILE_ID: 'legacy-profile',
      },
      'local'
    );

    expect(result.ok).toBe(true);
    expect(result.values.encodingClientId).toBe('legacy-client');
    expect(result.values.encodingClientSecret).toBe('legacy-secret');
    expect(result.values.encodingProfileDrm).toBe('legacy-profile');
    expect(result.warnings).toHaveLength(3);
  });

  test('strict mode rejects legacy-only aliases', () => {
    const result = validateAxinomEnv(
      {
        AX_CLIENT_ID: 'legacy-client',
        AX_CLIENT_SECRET: 'legacy-secret',
        AX_PROFILE_ID: 'legacy-profile',
      },
      'strict'
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('AXINOM_ENCODING_CLIENT_ID is missing; legacy alias AX_CLIENT_ID is present'),
        expect.stringContaining('AXINOM_ENCODING_CLIENT_SECRET is missing; legacy alias AX_CLIENT_SECRET is present'),
        expect.stringContaining('AXINOM_ENCODING_PROFILE_DRM is missing; legacy alias AX_PROFILE_ID is present'),
      ])
    );
  });

  test('public license URL overrides replace Axinom defaults', () => {
    const result = validateAxinomEnv(
      {
        NEXT_PUBLIC_AX_WV_LS_URL: 'https://tenant.example/wv',
        NEXT_PUBLIC_AX_PR_LS_URL: 'https://tenant.example/pr',
        NEXT_PUBLIC_AX_FP_LS_URL: 'https://tenant.example/fp',
      },
      'local'
    );

    expect(result.values.widevineLicenseUrl).toBe('https://tenant.example/wv');
    expect(result.values.playreadyLicenseUrl).toBe('https://tenant.example/pr');
    expect(result.values.fairplayLicenseUrl).toBe('https://tenant.example/fp');
  });
});
