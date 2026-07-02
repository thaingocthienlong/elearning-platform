import { loadTencentEnv, validateTencentEnv } from '@/lib/tencent/env';

const validEnv = {
  TENCENT_SECRET_ID: 'test-secret-id',
  TENCENT_SECRET_KEY: 'test-secret-key',
  TENCENT_VOD_REGION: 'ap-singapore',
  TENCENT_VOD_SUB_APP_ID: '123456',
  TENCENT_VOD_PROCEDURE_NAME: 'course-drm-720p',
  TENCENT_VOD_WEBHOOK_SIGN_KEY: 'test-webhook-sign-key',
  NEXT_PUBLIC_TENCENT_WIDEVINE_LICENSE_URL: 'https://widevine.drm.vod-qcloud.com/widevine/getlicense/v2',
  NEXT_PUBLIC_TENCENT_FAIRPLAY_LICENSE_URL: 'https://fairplay.drm.vod-qcloud.com/fairplay/getlicense/v2',
  NEXT_PUBLIC_TENCENT_FAIRPLAY_CERT_URL: 'https://example.invalid/fairplay.cer',
};

describe('Tencent env', () => {
  test('loads valid env with numeric sub app id', () => {
    expect(loadTencentEnv(validEnv)).toMatchObject({
      secretId: 'test-secret-id',
      region: 'ap-singapore',
      subAppId: 123456,
      procedureName: 'course-drm-720p',
    });
  });

  test('strict validation reports missing names without values', () => {
    const result = validateTencentEnv({}, 'strict');
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('TENCENT_SECRET_ID is required for Tencent strict validation.');
    expect(result.errors.join('\n')).not.toContain('test-secret-key');
  });

  test('local validation allows missing live credentials', () => {
    const result = validateTencentEnv({}, 'local');
    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('Tencent live credentials are not configured; live checks will be skipped.');
  });
});
