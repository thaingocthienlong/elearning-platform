import crypto from 'node:crypto';

const HOST = 'vod.tencentcloudapi.com';
const ALGORITHM = 'TC3-HMAC-SHA256';

type AuthorizationInput = {
  canonicalHeaders: string;
  hashedRequestPayload: string;
  secretId: string;
  secretKey: string;
  service: 'vod';
  timestamp: number;
};

type SignedHeadersInput = {
  action: string;
  payload: string;
  region: string;
  secretId: string;
  secretKey: string;
  service: 'vod';
  timestamp: number;
  version: string;
};

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

export function buildTencentAuthorizationHeader(input: AuthorizationInput) {
  const date = formatDate(input.timestamp);
  const credentialScope = `${date}/${input.service}/tc3_request`;
  const canonicalRequest = [
    'POST',
    '/',
    '',
    input.canonicalHeaders,
    'content-type;host',
    input.hashedRequestPayload,
  ].join('\n');
  const stringToSign = [
    ALGORITHM,
    String(input.timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const secretDate = hmac(`TC3${input.secretKey}`, date);
  const secretService = hmac(secretDate, input.service);
  const secretSigning = hmac(secretService, 'tc3_request');
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex');

  return `${ALGORITHM} Credential=${input.secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;
}

export function createTencentSignedHeaders(input: SignedHeadersInput): Record<string, string> {
  const canonicalHeaders = `content-type:application/json\nhost:${HOST}\n`;
  return {
    Authorization: buildTencentAuthorizationHeader({
      canonicalHeaders,
      hashedRequestPayload: sha256Hex(input.payload),
      secretId: input.secretId,
      secretKey: input.secretKey,
      service: input.service,
      timestamp: input.timestamp,
    }),
    'Content-Type': 'application/json',
    Host: HOST,
    'X-TC-Action': input.action,
    'X-TC-Region': input.region,
    'X-TC-Timestamp': String(input.timestamp),
    'X-TC-Version': input.version,
  };
}
