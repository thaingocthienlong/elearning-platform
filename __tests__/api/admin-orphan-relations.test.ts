/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET as getAdminViews } from '@/app/api/admin/views/route';
import { GET as getSessionFingerprints } from '@/app/api/admin/session-fingerprints/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    watchRecord: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    video: {
      findMany: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  watchRecord: { findMany: jest.Mock };
  user: { findMany: jest.Mock };
  video: { findMany: jest.Mock };
  session: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
};

function request(url: string) {
  return new Request(url) as never;
}

describe('admin orphan relation resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
    });
  });

  test('admin views tolerate watch records whose user or video was deleted', async () => {
    mockedPrisma.watchRecord.findMany.mockImplementation(async (args) => {
      if (args?.include?.User || args?.include?.Video) {
        throw new Error(
          'Inconsistent query result: Field Video is required to return data, got `null` instead.'
        );
      }

      return [
        {
          id: 'watch-1',
          userId: 'missing-user',
          videoId: 'missing-video',
          lastPosition: 42,
          viewCount: 3,
          viewLimit: null,
          lastViewedAt: new Date('2026-06-02T03:35:04.000Z'),
        },
      ];
    });
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.video.findMany.mockResolvedValue([]);

    const response = await getAdminViews();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        id: 'watch-1',
        userName: 'Nguoi dung khong ton tai',
        userEmail: 'Email khong ton tai',
        videoTitle: 'Video khong ton tai',
        videoViewLimit: null,
      }),
    ]);
  });

  test('session fingerprints tolerate sessions whose user was deleted', async () => {
    mockedPrisma.session.findMany.mockImplementation(async (args) => {
      if (args?.include?.user) {
        throw new Error(
          'Inconsistent query result: Field user is required to return data, got `null` instead.'
        );
      }

      if (args?.distinct?.includes('ipAddress')) {
        return [{ userId: 'missing-user', ipAddress: '203.0.113.10' }];
      }

      if (args?.distinct?.includes('userId')) {
        return [{ userId: 'missing-user' }];
      }

      return [
        {
          id: 'session-1',
          userId: 'missing-user',
          sessionToken: 'session-token',
          fingerprint: 'fingerprint-1',
          userAgent: null,
          ipAddress: '203.0.113.10',
          lastActive: new Date('2026-06-02T03:35:01.000Z'),
          expires: new Date('2026-06-03T03:35:01.000Z'),
        },
      ];
    });
    mockedPrisma.session.count.mockResolvedValue(1);
    mockedPrisma.user.findMany.mockResolvedValue([]);

    const response = await getSessionFingerprints(
      request('http://localhost.test/api/admin/session-fingerprints?page=1&limit=20')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessions).toEqual([
      expect.objectContaining({
        id: 'session-1',
        userId: 'missing-user',
        user: {
          name: 'Nguoi dung khong ton tai',
          email: 'missing-user',
        },
      }),
    ]);
  });
});
