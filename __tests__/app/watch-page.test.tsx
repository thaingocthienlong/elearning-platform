import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { evaluateMediaEntitlement } from '@/lib/media-entitlement';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { getVdoCipherOtp, VdoCipherApiError } from '@/lib/vdocipher';
import { getPlaybackBrowserGate } from '@/lib/playback-browser-allowlist';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    allowedEmail: {
      findUnique: jest.fn(),
    },
    video: {
      findMany: jest.fn(),
    },
    watchRecord: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/media-entitlement', () => ({
  evaluateMediaEntitlement: jest.fn(),
}));

jest.mock('@/lib/vdocipher-accounts', () => ({
  resolveVdoCipherAccount: jest.fn(),
}));

jest.mock('@/lib/vdocipher', () => ({
  VdoCipherApiError: class VdoCipherApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'VdoCipherApiError';
      this.status = status;
    }
  },
  getVdoCipherOtp: jest.fn(),
}));

jest.mock('@/lib/playback-browser-allowlist', () => ({
  getPlaybackBrowserGate: jest.fn(),
}));

jest.mock('@/components/video/SecurityWrapper', () => ({
  SecurityWrapper: ({ children }: { children: ReactNode }) => (
    <div data-testid="security-wrapper">{children}</div>
  ),
}));

jest.mock('@/components/course/WatchPageClient', () => ({
  __esModule: true,
  default: () => <div data-testid="watch-page-client" />,
}));

jest.mock('@/components/video/UnsupportedPlaybackBrowser', () => ({
  UnsupportedPlaybackBrowser: ({ browserName }: { browserName: string }) => (
    <div data-testid="unsupported-browser">{browserName}</div>
  ),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedHeaders = headers as jest.Mock;
const mockedEvaluateMediaEntitlement = evaluateMediaEntitlement as jest.Mock;
const mockedResolveVdoCipherAccount = resolveVdoCipherAccount as jest.Mock;
const mockedGetVdoCipherOtp = getVdoCipherOtp as jest.Mock;
const mockedGetPlaybackBrowserGate = getPlaybackBrowserGate as jest.Mock;
const mockedPrisma = prisma as unknown as {
  allowedEmail: { findUnique: jest.Mock };
  video: { findMany: jest.Mock };
  watchRecord: { findMany: jest.Mock };
};

describe('watch page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'session-user-id', email: 'learner@example.test' },
    });
    mockedHeaders.mockResolvedValue(new Headers({ 'user-agent': 'Chrome' }));
    mockedGetPlaybackBrowserGate.mockReturnValue({ allowed: true, browserName: 'Chrome' });
    mockedEvaluateMediaEntitlement.mockResolvedValue({
      allowed: true,
      user: { id: 'user-id', name: 'Learner', email: 'learner@example.test' },
      video: {
        id: 'local-video-id',
        courseId: 'course-id',
        provider: 'VDOCIPHER',
        vdocipherAccountId: 'primary',
        vdocipherVideoId: 'missing-vdo-id',
        vdocipherStatus: 'READY',
        Course: { title: 'Course title' },
      },
      watchRecord: null,
      effectiveViewLimit: null,
    });
    mockedPrisma.allowedEmail.findUnique.mockResolvedValue(null);
    mockedPrisma.video.findMany.mockResolvedValue([]);
    mockedPrisma.watchRecord.findMany.mockResolvedValue([]);
    mockedResolveVdoCipherAccount.mockReturnValue({
      id: 'primary',
      apiSecret: 'secret',
      isDefault: true,
    });
  });

  it('renders a stable unavailable state when VdoCipher OTP reports video not found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedGetVdoCipherOtp.mockRejectedValue(new VdoCipherApiError('video not found', 404));
    const { default: WatchPage } = await import('@/app/watch/[videoId]/page');

    const ui = await WatchPage({
      params: Promise.resolve({ videoId: 'local-video-id' }),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: 'Video temporarily unavailable' })).toBeInTheDocument();
    expect(screen.queryByTestId('watch-page-client')).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      'VdoCipher playback initialization failed',
      expect.objectContaining({
        videoId: 'local-video-id',
        vdoCipherVideoId: 'missing-vdo-id',
        vdocipherAccountId: 'primary',
        providerStatus: 404,
        message: 'video not found',
      })
    );

    consoleSpy.mockRestore();
  });
});
