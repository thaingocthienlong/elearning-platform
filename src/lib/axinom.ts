import jwt from 'jsonwebtoken';

export interface AxinomLicenseServiceMessage {
  version: 1;
  com_key_id: string;
  expiration_date?: string;
  message: AxinomEntitlementMessage;
}

export interface AxinomEntitlementMessage {
  type: 'entitlement_message';
  version: 2;
  license: {
    start_datetime?: string;
    expiration_datetime?: string;
    duration?: number;
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
  messageTtlSeconds?: number;
  licenseDurationSeconds?: number;
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

function assertSecondsInRange(name: string, value: number, max: number) {
  if (!Number.isInteger(value) || value <= 0 || value > max) {
    throw new Error(`Axinom ${name} must be between 1 and ${max}`);
  }
}

export function buildAxinomLicenseServiceMessage({
  keyIds,
  userId,
  sessionId,
  now = new Date(),
  ttlSeconds = 300,
  messageTtlSeconds,
  licenseDurationSeconds,
  allowPersistence = false,
}: GenerateAxinomTokenOptions): AxinomLicenseServiceMessage {
  const normalizedKeyIds = normalizeKeyIds(keyIds);

  if (normalizedKeyIds.length === 0) {
    throw new Error('At least one Axinom key ID is required');
  }

  const start = now.toISOString();
  const comKeyId = requireEnv('AXINOM_COM_KEY_ID');
  const usesSeparateLicenseDuration =
    messageTtlSeconds !== undefined || licenseDurationSeconds !== undefined;

  const license = usesSeparateLicenseDuration
    ? (() => {
        const duration = licenseDurationSeconds ?? 7200;
        assertSecondsInRange('licenseDurationSeconds', duration, 86400);

        return {
          duration,
          allow_persistence: allowPersistence,
        };
      })()
    : (() => {
        assertSecondsInRange('token ttlSeconds', ttlSeconds, 3600);

        return {
          start_datetime: start,
          expiration_datetime: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
          allow_persistence: allowPersistence,
        };
      })();

  const message: AxinomEntitlementMessage = {
    type: 'entitlement_message',
    version: 2,
    license,
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

  const payload: AxinomLicenseServiceMessage = {
    version: 1,
    com_key_id: comKeyId,
    message,
  };

  if (usesSeparateLicenseDuration) {
    const messageTtl = messageTtlSeconds ?? 300;
    assertSecondsInRange('messageTtlSeconds', messageTtl, 3600);
    payload.expiration_date = new Date(now.getTime() + messageTtl * 1000).toISOString();
  }

  return payload;
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
