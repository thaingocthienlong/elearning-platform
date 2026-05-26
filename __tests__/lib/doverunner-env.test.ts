import { readDoveRunnerConfig } from '@/lib/media-provider/doverunner-env';

describe('DoveRunner env config', () => {
  test('reads required config and defaults safe optional values', () => {
    const config = readDoveRunnerConfig({
      DOVERUNNER_SITE_ID: 'DEMO',
      DOVERUNNER_ACCESS_KEY: 'site-access-key',
      DOVERUNNER_TNP_ACCOUNT_ID: 'account@example.test',
      DOVERUNNER_TNP_ACCESS_KEY: 'tnp-access-key',
      DOVERUNNER_TNP_INPUT_STORAGE_ID: 'input-storage',
      DOVERUNNER_TNP_OUTPUT_STORAGE_ID: 'output-storage',
      DOVERUNNER_OUTPUT_BASE_URL: 'https://cdn.example.test/output/',
      AWS_REGION: 'ap-southeast-1',
      AWS_S3_INPUT_BUCKET: 'input-bucket',
      AWS_S3_OUTPUT_BUCKET: 'output-bucket',
      AWS_ACCESS_KEY_ID: 'aws-access-key',
      AWS_SECRET_ACCESS_KEY: 'aws-secret-key',
    });

    expect(config.siteId).toBe('DEMO');
    expect(config.licenseUrl).toBe('https://drm-license.doverunner.com/ri/licenseManager.do');
    expect(config.tnpApiBaseUrl).toBe('https://tnp.doverunner.com');
    expect(config.outputBaseUrl).toBe('https://cdn.example.test/output');
    expect(config.dashManifestName).toBe('manifest.mpd');
    expect(config.hlsManifestName).toBe('master.m3u8');
    expect(config.tnpDrmEnabled).toBe(true);
  });

  test('allows T&P DRM packaging to be disabled for provider isolation', () => {
    const config = readDoveRunnerConfig({
      DOVERUNNER_SITE_ID: 'DEMO',
      DOVERUNNER_ACCESS_KEY: 'site-access-key',
      DOVERUNNER_TNP_ACCOUNT_ID: 'account@example.test',
      DOVERUNNER_TNP_ACCESS_KEY: 'tnp-access-key',
      DOVERUNNER_TNP_INPUT_STORAGE_ID: 'input-storage',
      DOVERUNNER_TNP_OUTPUT_STORAGE_ID: 'output-storage',
      DOVERUNNER_OUTPUT_BASE_URL: 'https://cdn.example.test/output/',
      DOVERUNNER_TNP_DRM_ENABLED: 'false',
      AWS_REGION: 'ap-southeast-1',
      AWS_S3_INPUT_BUCKET: 'input-bucket',
      AWS_S3_OUTPUT_BUCKET: 'output-bucket',
      AWS_ACCESS_KEY_ID: 'aws-access-key',
      AWS_SECRET_ACCESS_KEY: 'aws-secret-key',
    });

    expect(config.tnpDrmEnabled).toBe(false);
  });

  test('throws with variable names but not secret values', () => {
    expect(() =>
      readDoveRunnerConfig({
        DOVERUNNER_SITE_ID: 'DEMO',
        DOVERUNNER_ACCESS_KEY: 'secret-value',
      })
    ).toThrow(/DOVERUNNER_TNP_ACCOUNT_ID/);

    try {
      readDoveRunnerConfig({
        DOVERUNNER_SITE_ID: 'DEMO',
        DOVERUNNER_ACCESS_KEY: 'secret-value',
      });
    } catch (error) {
      expect(String(error)).not.toContain('secret-value');
    }
  });
});
