import {
  createTencentDrmToken,
  createTencentUploadSignature,
  normalizeTencentStatus,
  processTencentMedia,
  resolveTencentLicenseUrl,
} from '@/lib/tencent/vod';
import { callTencentVod } from '@/lib/tencent/client';
import { loadTencentEnv } from '@/lib/tencent/env';

jest.mock('@/lib/tencent/env', () => ({
  loadTencentEnv: jest.fn(() => ({
    secretId: 'test-secret-id',
    secretKey: 'test-secret-key',
    playbackKey: 'test-playback-key',
    procedureName: 'course-drm-720p',
    subAppId: 123456,
    widevineLicenseUrl: 'https://widevine.example/license',
    fairplayLicenseUrl: 'https://fairplay.example/license',
  })),
}));

jest.mock('@/lib/tencent/client', () => ({
  callTencentVod: jest.fn(),
}));

const mockedCallTencentVod = callTencentVod as jest.Mock;
const mockedLoadTencentEnv = loadTencentEnv as jest.Mock;

describe('Tencent VOD service helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalizes Tencent processing states', () => {
    expect(normalizeTencentStatus('FINISH')).toBe('READY');
    expect(normalizeTencentStatus('PROCESSING')).toBe('PROCESSING');
    expect(normalizeTencentStatus('FAIL')).toBe('FAILED');
    expect(normalizeTencentStatus('')).toBe('UNKNOWN');
  });

  test('resolves license URLs by DRM type', () => {
    const env = {
      widevineLicenseUrl: 'https://widevine.example/license',
      fairplayLicenseUrl: 'https://fairplay.example/license',
    };

    expect(resolveTencentLicenseUrl('widevine', env)).toBe('https://widevine.example/license');
    expect(resolveTencentLicenseUrl('fairplay', env)).toBe('https://fairplay.example/license');
  });

  test('creates client upload signature without exposing secret key', () => {
    const result = createTencentUploadSignature({
      videoId: '64b7f0000000000000000002',
      nowSeconds: 1700000000,
      random: 12345,
    });
    const decoded = Buffer.from(result.signature, 'base64').toString('utf8');

    expect(result.currentTimeStamp).toBe(1700000000);
    expect(result.expireTime).toBe(1700003600);
    expect(decoded).toContain('secretId=test-secret-id');
    expect(decoded).toContain('procedure=course-drm-720p');
    expect(decoded).toContain('sourceContext=64b7f0000000000000000002');
    expect(decoded).toContain('vodSubAppId=123456');
    expect(decoded).not.toContain('test-secret-key');
  });

  test('creates Tencent DrmToken using official tilde-delimited format', () => {
    mockedLoadTencentEnv.mockReturnValueOnce({
      secretId: 'test-secret-id',
      secretKey: 'test-secret-key',
      playbackKey: 'JduzsUuRvGVPRHvIYwLv',
      procedureName: 'course-drm-720p',
      subAppId: 1500014561,
      widevineLicenseUrl: 'https://widevine.example/license',
      fairplayLicenseUrl: 'https://fairplay.example/license',
    });

    const token = createTencentDrmToken({
      fileId: '387702307091793695',
      nowSeconds: 1650964374,
      expiresAt: new Date(2147483647 * 1000),
      random: 4220003655,
      multiDrm: false,
    });

    expect(token).toBe(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9~eyJ0eXBlIjoiRHJtVG9rZW4iLCJhcHBJZCI6MTUwMDAxNDU2MSwiZmlsZUlkIjoiMzg3NzAyMzA3MDkxNzkzNjk1IiwiY3VycmVudFRpbWVTdGFtcCI6MTY1MDk2NDM3NCwiZXhwaXJlVGltZVN0YW1wIjoyMTQ3NDgzNjQ3LCJyYW5kb20iOjQyMjAwMDM2NTUsImlzc3VlciI6ImNsaWVudCJ9~NN_EBW7VxGK69v-w9Q7Dw-sm8Uryfe_NdRUe3RZZ4wY'
    );
  });

  test('submits named task flow through ProcessMediaByProcedure', async () => {
    mockedCallTencentVod.mockResolvedValue({ TaskId: 'task-id', RequestId: 'request-id' });

    await expect(processTencentMedia('tencent-file-id')).resolves.toEqual({
      TaskId: 'task-id',
      RequestId: 'request-id',
    });

    expect(mockedCallTencentVod).toHaveBeenCalledWith('ProcessMediaByProcedure', {
      FileId: 'tencent-file-id',
      ProcedureName: 'course-drm-720p',
    });
  });
});
