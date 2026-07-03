import crypto from 'node:crypto';
import { verifyTencentWebhookSignature } from '@/lib/tencent/webhook';

describe('Tencent webhook verification', () => {
  test('accepts md5 sign key plus timestamp signature', () => {
    const timestamp = '1700000000';
    const secret = 'test-webhook-sign-key';
    const sign = crypto.createHash('md5').update(`${secret}${timestamp}`, 'utf8').digest('hex');

    expect(verifyTencentWebhookSignature({ sign, timestamp, secret, nowSeconds: 1700000100 })).toBe(true);
  });

  test('rejects expired timestamp', () => {
    const timestamp = '1600000000';
    const secret = 'test-webhook-sign-key';
    const sign = crypto.createHash('md5').update(`${secret}${timestamp}`, 'utf8').digest('hex');

    expect(verifyTencentWebhookSignature({
      sign,
      timestamp,
      secret,
      nowSeconds: 1700000000,
    })).toBe(false);
  });

  test('rejects malformed signature', () => {
    expect(verifyTencentWebhookSignature({
      sign: 'bad',
      timestamp: '1700000000',
      secret: 'test-webhook-sign-key',
      nowSeconds: 1700000000,
    })).toBe(false);
  });
});
