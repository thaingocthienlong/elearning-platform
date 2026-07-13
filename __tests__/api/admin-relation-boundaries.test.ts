/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET as getSecurityEvents } from '@/app/api/admin/security-events/route';
import { GET as getAllVideos } from '@/app/api/admin/videos/all/route';
import { DELETE as revokeFingerprint } from '@/app/api/admin/session-fingerprints/[id]/route';
import { revokeSession } from '@/lib/session-revocation';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/session-revocation', () => ({
  revokeSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    securityEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    revokedSession: {
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    video: {
      findMany: jest.fn(),
    },
    course: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedRevokeSession = revokeSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  securityEvent: { findMany: jest.Mock; count: jest.Mock };
  session: { findUnique: jest.Mock; delete: jest.Mock };
  revokedSession: { create: jest.Mock };
  user: { findMany: jest.Mock; findUnique: jest.Mock };
  video: { findMany: jest.Mock };
  course: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

describe('admin relation boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
    });
  });

  test('security events return fallback identities instead of failing on orphan rows', async () => {
    mockedPrisma.securityEvent.findMany.mockImplementation(async (args) => {
      if (args?.include?.User || args?.include?.Video) {
        throw new Error('Inconsistent query result: Field User is required to return data');
      }
      return [
        {
          id: 'event-1',
          userId: 'missing-user',
          videoId: 'missing-video',
          eventType: 'TAB_SWITCH_WHILE_WATCHING',
          metadata: null,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date('2026-07-13T00:00:00.000Z'),
        },
      ];
    });
    mockedPrisma.securityEvent.count.mockResolvedValue(1);
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.video.findMany.mockResolvedValue([]);

    const response = await getSecurityEvents(
      new Request('http://localhost.test/api/admin/security-events') as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toEqual([
      expect.objectContaining({
        id: 'event-1',
        User: {
          name: 'Nguoi dung khong ton tai',
          email: 'Email khong ton tai',
        },
        Video: null,
      }),
    ]);
  });

  test('video option list tolerates a video whose course was deleted', async () => {
    mockedPrisma.video.findMany.mockImplementation(async (args) => {
      if (args?.include?.Course) {
        throw new Error('Inconsistent query result: Field Course is required to return data');
      }
      return [{ id: 'video-1', title: 'Orphan video', courseId: 'missing-course' }];
    });
    mockedPrisma.course.findMany.mockResolvedValue([]);

    const response = await getAllVideos();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      {
        id: 'video-1',
        title: 'Orphan video',
        courseId: 'missing-course',
        courseTitle: 'Unknown Course',
      },
    ]);
  });

  test('session revoke succeeds when the related user row is missing', async () => {
    mockedPrisma.session.findUnique.mockImplementation(async (args) => {
      if (args?.include?.user) {
        throw new Error('Inconsistent query result: Field user is required to return data');
      }
      return {
        id: 'session-1',
        userId: 'missing-user',
        sessionToken: 'token-1',
      };
    });
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.session.delete.mockReturnValue({ operation: 'delete-session' });
    mockedPrisma.revokedSession.create.mockReturnValue({ operation: 'create-audit' });
    mockedPrisma.$transaction.mockResolvedValue([]);
    mockedRevokeSession.mockResolvedValue({ redis: true, broadcast: 1 });

    const response = await revokeFingerprint(
      new Request('http://localhost.test/api/admin/session-fingerprints/session-1') as never,
      { params: Promise.resolve({ id: 'session-1' }) }
    );

    expect(response.status).toBe(200);
    expect(mockedRevokeSession).toHaveBeenCalledWith('token-1', 'Revoked by admin');
    expect(mockedPrisma.revokedSession.create).toHaveBeenCalledWith({
      data: {
        email: 'deleted-user:missing-user',
        reason: 'Revoked by admin',
      },
    });
  });
});
