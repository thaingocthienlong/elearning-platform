import 'server-only';

import { listConfiguredVdoCipherAccounts } from '@/lib/vdocipher-accounts';
import {
  getVdoCipherOtp,
  getVdoCipherVideoStatus,
  VdoCipherApiError,
  type VdoCipherOtpResponse,
  type VdoCipherStatusResponse,
} from '@/lib/vdocipher';

type AccountFallbackOptions = {
  preferredAccountId?: string | null;
  vdoCipherVideoId: string;
};

type OtpFallbackOptions = AccountFallbackOptions & {
  ttl: number;
  annotate?: string;
};

export type VdoCipherAccountFallbackResult<T> = {
  accountId: string;
  attemptedAccountIds: string[];
  recovered: boolean;
  result: T;
};

function shouldTryNextAccount(error: unknown) {
  return error instanceof VdoCipherApiError && error.status === 404;
}

function noConfiguredAccountsError() {
  return new Error('No configured VdoCipher account is available');
}

export async function getVdoCipherOtpWithAccountFallback({
  preferredAccountId,
  vdoCipherVideoId,
  ttl,
  annotate,
}: OtpFallbackOptions): Promise<VdoCipherAccountFallbackResult<VdoCipherOtpResponse>> {
  const accounts = listConfiguredVdoCipherAccounts(preferredAccountId);
  const attemptedAccountIds: string[] = [];
  let lastError: unknown = accounts.length > 0 ? undefined : noConfiguredAccountsError();

  for (const account of accounts) {
    attemptedAccountIds.push(account.id);

    try {
      const result = await getVdoCipherOtp({
        apiSecret: account.apiSecret,
        vdoCipherVideoId,
        ttl,
        annotate,
      });

      return {
        accountId: account.id,
        attemptedAccountIds,
        recovered: account.id !== preferredAccountId?.trim(),
        result,
      };
    } catch (error) {
      lastError = error;

      if (!shouldTryNextAccount(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function getVdoCipherVideoStatusWithAccountFallback({
  preferredAccountId,
  vdoCipherVideoId,
}: AccountFallbackOptions): Promise<VdoCipherAccountFallbackResult<VdoCipherStatusResponse>> {
  const accounts = listConfiguredVdoCipherAccounts(preferredAccountId);
  const attemptedAccountIds: string[] = [];
  let lastError: unknown = accounts.length > 0 ? undefined : noConfiguredAccountsError();

  for (const account of accounts) {
    attemptedAccountIds.push(account.id);

    try {
      const result = await getVdoCipherVideoStatus({
        apiSecret: account.apiSecret,
        vdoCipherVideoId,
      });

      return {
        accountId: account.id,
        attemptedAccountIds,
        recovered: account.id !== preferredAccountId?.trim(),
        result,
      };
    } catch (error) {
      lastError = error;

      if (!shouldTryNextAccount(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}
