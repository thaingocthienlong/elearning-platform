import crypto from 'node:crypto';

export function verifyTencentWebhookSignature(input: {
  sign: string | null;
  timestamp: string | null;
  secret: string;
  nowSeconds?: number;
  maxAgeSeconds?: number;
}) {
  if (!input.sign || !input.timestamp || !/^\d+$/.test(input.timestamp)) return false;

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAge = input.maxAgeSeconds ?? 300;
  const timestampNumber = Number(input.timestamp);
  if (Math.abs(now - timestampNumber) > maxAge) return false;

  const expected = crypto.createHash('md5').update(`${input.secret}${input.timestamp}`, 'utf8').digest('hex');
  const actual = input.sign.toLowerCase();
  if (expected.length !== actual.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
