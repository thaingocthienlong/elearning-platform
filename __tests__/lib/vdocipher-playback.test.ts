/**
 * @jest-environment node
 */
jest.mock('@/lib/vdocipher', () => {
  class VdoCipherApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'VdoCipherApiError';
      this.status = status;
    }
  }

  return {
    VdoCipherApiError,
    getVdoCipherOtp: jest.fn(),
    getVdoCipherVideoStatus: jest.fn(),
  };
});

import {
  getVdoCipherOtp,
  getVdoCipherVideoStatus,
  VdoCipherApiError,
} from '@/lib/vdocipher';
import {
  getVdoCipherOtpWithAccountFallback,
  getVdoCipherVideoStatusWithAccountFallback,
} from '@/lib/vdocipher-playback';

const mockedGetVdoCipherOtp = getVdoCipherOtp as jest.Mock;
const mockedGetVdoCipherVideoStatus = getVdoCipherVideoStatus as jest.Mock;

describe('vdocipher account fallback', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...oldEnv };
    process.env.VDOCIPHER_ACCOUNT_IDS = 'primary,backup-4,backup-5';
    process.env.VDOCIPHER_DEFAULT_ACCOUNT_ID = 'primary';
    process.env.VDOCIPHER_API_SECRET_PRIMARY = 'secret-primary';
    process.env.VDOCIPHER_API_SECRET_BACKUP_4 = 'secret-backup-4';
    process.env.VDOCIPHER_API_SECRET_BACKUP_5 = 'secret-backup-5';
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('tries another account when OTP generation returns provider 404', async () => {
    mockedGetVdoCipherOtp
      .mockRejectedValueOnce(new VdoCipherApiError('video not found', 404))
      .mockResolvedValueOnce({ otp: 'otp', playbackInfo: 'playback' });

    const result = await getVdoCipherOtpWithAccountFallback({
      preferredAccountId: 'backup-5',
      vdoCipherVideoId: 'vdo-id',
      ttl: 300,
    });

    expect(mockedGetVdoCipherOtp).toHaveBeenNthCalledWith(1, {
      apiSecret: 'secret-backup-5',
      vdoCipherVideoId: 'vdo-id',
      ttl: 300,
      annotate: undefined,
    });
    expect(mockedGetVdoCipherOtp).toHaveBeenNthCalledWith(2, {
      apiSecret: 'secret-primary',
      vdoCipherVideoId: 'vdo-id',
      ttl: 300,
      annotate: undefined,
    });
    expect(result).toEqual({
      accountId: 'primary',
      attemptedAccountIds: ['backup-5', 'primary'],
      recovered: true,
      result: { otp: 'otp', playbackInfo: 'playback' },
    });
  });

  it('does not try another account for non-404 OTP failures', async () => {
    mockedGetVdoCipherOtp.mockRejectedValueOnce(new VdoCipherApiError('Invalid API secret', 401));

    await expect(
      getVdoCipherOtpWithAccountFallback({
        preferredAccountId: 'backup-5',
        vdoCipherVideoId: 'vdo-id',
        ttl: 300,
      })
    ).rejects.toMatchObject({ status: 401 });

    expect(mockedGetVdoCipherOtp).toHaveBeenCalledTimes(1);
  });

  it('tries another account when status lookup returns provider 404', async () => {
    mockedGetVdoCipherVideoStatus
      .mockRejectedValueOnce(new VdoCipherApiError('video not found', 404))
      .mockResolvedValueOnce({ status: 'ready', poster: 'https://poster.example.test' });

    const result = await getVdoCipherVideoStatusWithAccountFallback({
      preferredAccountId: 'backup-5',
      vdoCipherVideoId: 'vdo-id',
    });

    expect(result).toEqual({
      accountId: 'primary',
      attemptedAccountIds: ['backup-5', 'primary'],
      recovered: true,
      result: { status: 'ready', poster: 'https://poster.example.test' },
    });
  });
});
