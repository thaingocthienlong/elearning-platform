import 'server-only';

export type SafeVdoCipherAccount = {
  id: string;
  isDefault: boolean;
  configured: boolean;
};

export type ResolvedVdoCipherAccount = {
  id: string;
  apiSecret: string;
  isDefault: boolean;
};

function splitAccountIds(value: string | undefined) {
  const rawValue = value?.trim() ? value : 'primary';
  const ids = rawValue
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return ids.length > 0 ? ids : ['primary'];
}

function getVdoCipherAccountIds(env: NodeJS.ProcessEnv = process.env) {
  const ids = splitAccountIds(env.VDOCIPHER_ACCOUNT_IDS);
  const normalizedSuffixes = new Map<string, string>();

  for (const id of ids) {
    const suffix = getVdoCipherAccountEnvSuffix(id);
    const existingId = normalizedSuffixes.get(suffix);

    if (existingId) {
      throw new Error(
        `Duplicate VdoCipher account env suffix ${suffix} for accounts: ${existingId}, ${id}`
      );
    }

    normalizedSuffixes.set(suffix, id);
  }

  return ids;
}

export function getVdoCipherAccountEnvSuffix(accountId: string) {
  const suffix = accountId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!suffix) {
    throw new Error('VdoCipher account ID must contain at least one alphanumeric character');
  }

  return suffix;
}

function readSecret(accountId: string, env: NodeJS.ProcessEnv = process.env) {
  return env[`VDOCIPHER_API_SECRET_${getVdoCipherAccountEnvSuffix(accountId)}`]?.trim();
}

export function getDefaultVdoCipherAccountId(env: NodeJS.ProcessEnv = process.env) {
  const ids = getVdoCipherAccountIds(env);
  const configuredDefault = env.VDOCIPHER_DEFAULT_ACCOUNT_ID?.trim();

  if (configuredDefault) {
    if (!ids.includes(configuredDefault)) {
      throw new Error(`Unknown default VdoCipher account: ${configuredDefault}`);
    }

    return configuredDefault;
  }

  return ids[0] ?? 'primary';
}

export function listVdoCipherAccounts(env: NodeJS.ProcessEnv = process.env): SafeVdoCipherAccount[] {
  const ids = getVdoCipherAccountIds(env);
  const defaultId = getDefaultVdoCipherAccountId(env);

  return ids.map((id) => ({
    id,
    isDefault: id === defaultId,
    configured: Boolean(readSecret(id, env)),
  }));
}

export function listConfiguredVdoCipherAccounts(
  preferredAccountId?: string | null,
  env: NodeJS.ProcessEnv = process.env
): ResolvedVdoCipherAccount[] {
  const ids = getVdoCipherAccountIds(env);
  const defaultId = getDefaultVdoCipherAccountId(env);
  const preferred = preferredAccountId?.trim();
  const orderedIds = [
    preferred && ids.includes(preferred) ? preferred : null,
    ids.includes(defaultId) ? defaultId : null,
    ...ids,
  ].filter((id): id is string => Boolean(id));
  const uniqueOrderedIds = [...new Set(orderedIds)];

  return uniqueOrderedIds.flatMap((id) => {
    const apiSecret = readSecret(id, env);

    if (!apiSecret) {
      return [];
    }

    return [{
      id,
      apiSecret,
      isDefault: id === defaultId,
    }];
  });
}

export function resolveVdoCipherAccount(
  requestedAccountId?: string | null,
  env: NodeJS.ProcessEnv = process.env
): ResolvedVdoCipherAccount {
  const ids = getVdoCipherAccountIds(env);
  const accountId = requestedAccountId?.trim() || getDefaultVdoCipherAccountId(env);

  if (!ids.includes(accountId)) {
    throw new Error(`Unknown VdoCipher account: ${accountId}`);
  }

  const apiSecret = readSecret(accountId, env);

  if (!apiSecret) {
    throw new Error(`Missing VdoCipher API secret for account: ${accountId}`);
  }

  return {
    id: accountId,
    apiSecret,
    isDefault: accountId === getDefaultVdoCipherAccountId(env),
  };
}
