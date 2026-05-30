import crypto from 'node:crypto';

export function generateBunnyTusSignature({
  libraryId,
  apiKey,
  expirationTime,
  videoId,
}: {
  libraryId: string;
  apiKey: string;
  expirationTime: number;
  videoId: string;
}) {
  return crypto
    .createHash('sha256')
    .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
    .digest('hex');
}

export function generateBunnyEmbedToken({
  tokenSecurityKey,
  videoId,
  expires,
}: {
  tokenSecurityKey: string;
  videoId: string;
  expires: number;
}) {
  return crypto
    .createHash('sha256')
    .update(`${tokenSecurityKey}${videoId}${expires}`)
    .digest('hex');
}

export function verifyBunnyWebhookSignature({
  rawBody,
  signature,
  version,
  algorithm,
  readOnlyApiKey,
}: {
  rawBody: string;
  signature: string | null;
  version: string | null;
  algorithm: string | null;
  readOnlyApiKey: string;
}) {
  if (version !== 'v1' || algorithm !== 'hmac-sha256') {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', readOnlyApiKey)
    .update(rawBody, 'utf8')
    .digest('hex');

  if (
    typeof signature !== 'string' ||
    signature.length !== expected.length ||
    !/^[0-9a-f]+$/.test(signature)
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}
