import { buildTencentAuthorizationHeader, createTencentSignedHeaders } from '@/lib/tencent/signing';

describe('Tencent signing', () => {
  test('creates deterministic signed headers without exposing secret key', () => {
    const headers = createTencentSignedHeaders({
      action: 'DescribeMediaInfos',
      payload: '{"FileIds":["file-id-1"]}',
      region: 'ap-singapore',
      secretId: 'test-secret-id',
      secretKey: 'test-secret-key',
      service: 'vod',
      timestamp: 1700000000,
      version: '2018-07-17',
    });

    expect(headers['Authorization']).toContain('TC3-HMAC-SHA256');
    expect(headers['Authorization']).toContain('Credential=test-secret-id/');
    expect(headers['Authorization']).not.toContain('test-secret-key');
    expect(headers['X-TC-Action']).toBe('DescribeMediaInfos');
    expect(headers['X-TC-Region']).toBe('ap-singapore');
  });

  test('header builder includes signed content type and host', () => {
    const header = buildTencentAuthorizationHeader({
      canonicalHeaders: 'content-type:application/json\nhost:vod.tencentcloudapi.com\n',
      hashedRequestPayload: '0'.repeat(64),
      secretId: 'test-secret-id',
      secretKey: 'test-secret-key',
      service: 'vod',
      timestamp: 1700000000,
    });

    expect(header).toContain('SignedHeaders=content-type;host');
    expect(header).not.toContain('test-secret-key');
  });
});
