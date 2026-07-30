export const TOS_COOKIE_NAME = 'tos_access';
export const TOS_REQUIRED_CODE = 'TOS_ACCEPTANCE_REQUIRED';
export const TOS_VERSION = '2026-07-29';
export const TOS_TTL_SECONDS = 86_400;
export const TOS_MAX_TOKEN_LENGTH = 2_048;
export const TOS_MAX_SESSION_TOKEN_LENGTH = 512;
export const TOS_MAX_PAYLOAD_LENGTH = 1_024;
export const TOS_MAX_SIGNATURE_LENGTH = 512;

export const NEXTAUTH_SESSION_COOKIE_NAMES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
] as const;

const SIGNATURE_DOMAIN = 'tos-access-v1:';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type TosAccessPayload = {
  version: string;
  expiresAt: number;
  sessionHash: string;
};

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function readSessionToken(cookieStore: CookieReader): string | undefined {
  for (const name of NEXTAUTH_SESSION_COOKIE_NAMES) {
    const value = cookieStore.get(name)?.value;
    if (value) return value;
  }
  return undefined;
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function hashSessionToken(sessionToken: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(sessionToken));
  return encodeBase64Url(new Uint8Array(digest));
}

async function importHmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage,
  );
}

export async function createTosAccessToken(
  sessionToken: string,
  secret: string,
  nowMs = Date.now(),
): Promise<string> {
  if (!sessionToken || !secret || sessionToken.length > TOS_MAX_SESSION_TOKEN_LENGTH) {
    throw new Error('TOS signing inputs are missing');
  }

  const payload: TosAccessPayload = {
    version: TOS_VERSION,
    expiresAt: nowMs + TOS_TTL_SECONDS * 1000,
    sessionHash: await hashSessionToken(sessionToken),
  };
  const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${SIGNATURE_DOMAIN}${encodedPayload}`),
  );

  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyTosAccessToken(
  token: string | undefined,
  sessionToken: string | undefined,
  secret: string | undefined,
  nowMs = Date.now(),
): Promise<boolean> {
  if (
    !token ||
    !sessionToken ||
    !secret ||
    token.length > TOS_MAX_TOKEN_LENGTH ||
    sessionToken.length > TOS_MAX_SESSION_TOKEN_LENGTH
  ) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

    const [encodedPayload, encodedSignature] = parts;
    if (
      encodedPayload.length > TOS_MAX_PAYLOAD_LENGTH ||
      encodedSignature.length > TOS_MAX_SIGNATURE_LENGTH
    ) return false;
    const key = await importHmacKey(secret, ['verify']);
    const signatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(encodedSignature),
      encoder.encode(`${SIGNATURE_DOMAIN}${encodedPayload}`),
    );
    if (!signatureValid) return false;

    const payload = JSON.parse(
      decoder.decode(decodeBase64Url(encodedPayload)),
    ) as Partial<TosAccessPayload>;
    if (
      payload.version !== TOS_VERSION ||
      typeof payload.expiresAt !== 'number' ||
      !Number.isSafeInteger(payload.expiresAt) ||
      typeof payload.sessionHash !== 'string' ||
      payload.expiresAt <= nowMs ||
      payload.expiresAt > nowMs + TOS_TTL_SECONDS * 1000
    ) {
      return false;
    }

    return payload.sessionHash === await hashSessionToken(sessionToken);
  } catch {
    return false;
  }
}
