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
  return (value ?? 'primary')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
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
  const ids = splitAccountIds(env.VDOCIPHER_ACCOUNT_IDS);
  const configuredDefault = env.VDOCIPHER_DEFAULT_ACCOUNT_ID?.trim();

  if (configuredDefault && ids.includes(configuredDefault)) {
    return configuredDefault;
  }

  return ids[0] ?? 'primary';
}

export function listVdoCipherAccounts(env: NodeJS.ProcessEnv = process.env): SafeVdoCipherAccount[] {
  const ids = splitAccountIds(env.VDOCIPHER_ACCOUNT_IDS);
  const defaultId = getDefaultVdoCipherAccountId(env);

  return ids.map((id) => ({
    id,
    isDefault: id === defaultId,
    configured: Boolean(readSecret(id, env)),
  }));
}

export function resolveVdoCipherAccount(
  requestedAccountId?: string | null,
  env: NodeJS.ProcessEnv = process.env
): ResolvedVdoCipherAccount {
  const ids = splitAccountIds(env.VDOCIPHER_ACCOUNT_IDS);
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
