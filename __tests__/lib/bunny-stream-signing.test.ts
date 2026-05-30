import crypto from 'node:crypto';
import {
  generateBunnyEmbedToken,
  generateBunnyTusSignature,
  verifyBunnyWebhookSignature,
} from '@/lib/bunny-stream/signing';

describe('Bunny Stream signing', () => {
  test('generates TUS signature from documented value order', () => {
    const signature = generateBunnyTusSignature({
      libraryId: '123',
      apiKey: 'api-key',
      expirationTime: 2000,
      videoId: 'video-guid',
    });

    expect(signature).toBe(
      crypto
        .createHash('sha256')
        .update('123api-key2000video-guid')
        .digest('hex')
    );
  });

  test('generates embed token from token key, video ID, and expiration', () => {
    const token = generateBunnyEmbedToken({
      tokenSecurityKey: 'token-key',
      videoId: 'video-guid',
      expires: 3000,
    });

    expect(token).toBe(
      crypto
        .createHash('sha256')
        .update('token-keyvideo-guid3000')
        .digest('hex')
    );
  });

  test('validates Bunny webhook signature with raw body and read-only key', () => {
    const rawBody = JSON.stringify({
      VideoLibraryId: 123,
      VideoGuid: 'video-guid',
      Status: 3,
    });
    const signature = crypto
      .createHmac('sha256', 'read-only-key')
      .update(rawBody, 'utf8')
      .digest('hex');

    expect(
      verifyBunnyWebhookSignature({
        rawBody,
        signature,
        version: 'v1',
        algorithm: 'hmac-sha256',
        readOnlyApiKey: 'read-only-key',
      })
    ).toBe(true);
  });

  test('rejects webhook signatures with wrong version, algorithm, length, or value', () => {
    const args = {
      rawBody: '{"ok":true}',
      signature: '0'.repeat(64),
      version: 'v1',
      algorithm: 'hmac-sha256',
      readOnlyApiKey: 'read-only-key',
    };

    expect(verifyBunnyWebhookSignature({ ...args, version: 'v2' })).toBe(false);
    expect(verifyBunnyWebhookSignature({ ...args, algorithm: 'sha1' })).toBe(
      false
    );
    expect(verifyBunnyWebhookSignature({ ...args, signature: 'abc' })).toBe(
      false
    );
    expect(verifyBunnyWebhookSignature(args)).toBe(false);
  });
});
