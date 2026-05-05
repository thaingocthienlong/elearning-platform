import jwt from 'jsonwebtoken';

export interface AxinomLicenseServiceMessage {
  version: 1;
  com_key_id: string;
  message: AxinomEntitlementMessage;
}

export interface AxinomEntitlementMessage {
  type: 'entitlement_message';
  version: 2;
  license: {
    start_datetime: string;
    expiration_datetime: string;
    allow_persistence: boolean;
  };
  content_keys_source: {
    inline: {
      id: string;
      usage_policy?: string;
    }[];
  };
  user?: {
    id?: string;
    session_id?: string;
  };
}

export type GenerateAxinomTokenOptions = {
  keyIds: string | string[];
  userId?: string;
  sessionId?: string;
  now?: Date;
  ttlSeconds?: number;
  allowPersistence?: boolean;
};

function normalizeKeyIds(keyIds: string | string[]) {
  const ids = (Array.isArray(keyIds) ? keyIds : keyIds.split(','))
    .map((keyId) => keyId.trim())
    .filter(Boolean);

  return [...new Set(ids)];
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required Axinom env ${name}`);
  }

  return value;
}

export function buildAxinomLicenseServiceMessage({
  keyIds,
  userId,
  sessionId,
  now = new Date(),
  ttlSeconds = 300,
  allowPersistence = false,
}: GenerateAxinomTokenOptions): AxinomLicenseServiceMessage {
  const normalizedKeyIds = normalizeKeyIds(keyIds);

  if (normalizedKeyIds.length === 0) {
    throw new Error('At least one Axinom key ID is required');
  }

  if (ttlSeconds <= 0 || ttlSeconds > 3600) {
    throw new Error('Axinom token ttlSeconds must be between 1 and 3600');
  }

  const start = now.toISOString();
  const expiration = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const comKeyId = requireEnv('AXINOM_COM_KEY_ID');

  const message: AxinomEntitlementMessage = {
    type: 'entitlement_message',
    version: 2,
    license: {
      start_datetime: start,
      expiration_datetime: expiration,
      allow_persistence: allowPersistence,
    },
    content_keys_source: {
      inline: normalizedKeyIds.map((keyId) => ({ id: keyId })),
    },
  };

  if (userId || sessionId) {
    message.user = {
      ...(userId ? { id: userId } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
    };
  }

  return {
    version: 1,
    com_key_id: comKeyId,
    message,
  };
}

export function signAxinomLicenseServiceMessage(
  payload: AxinomLicenseServiceMessage,
  communicationKeySecret = requireEnv('AXINOM_COM_KEY_SECRET')
) {
  return jwt.sign(payload, Buffer.from(communicationKeySecret, 'base64'), {
    algorithm: 'HS256',
    noTimestamp: true,
  });
}

export function generateAxinomToken(
  keyIdsOrOptions: string | string[] | GenerateAxinomTokenOptions
) {
  const options =
    typeof keyIdsOrOptions === 'string' || Array.isArray(keyIdsOrOptions)
      ? { keyIds: keyIdsOrOptions }
      : keyIdsOrOptions;

  return signAxinomLicenseServiceMessage(
    buildAxinomLicenseServiceMessage(options)
  );
}
