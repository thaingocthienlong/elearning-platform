/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/admin/views/route';

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
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  watchRecord: {
    findMany: jest.Mock;
  };
  user: {
    findMany: jest.Mock;
  };
  video: {
    findMany: jest.Mock;
  };
};

describe('admin views route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
  });

  test('returns watch records when a related video is missing', async () => {
    mockedPrisma.watchRecord.findMany.mockResolvedValue([
      {
        id: 'record-1',
        userId: 'user-1',
        videoId: 'missing-video-1',
        lastPosition: 42,
        viewCount: 2,
        viewLimit: null,
        lastViewedAt: new Date('2026-05-27T02:41:32.000Z'),
      },
    ]);
    mockedPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        name: 'Learner One',
        email: 'learner@example.test',
      },
    ]);
    mockedPrisma.video.findMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      {
        id: 'record-1',
        userId: 'user-1',
        videoId: 'missing-video-1',
        lastPosition: 42,
        viewCount: 2,
        viewLimit: null,
        lastViewedAt: '2026-05-27T02:41:32.000Z',
        userName: 'Learner One',
        userEmail: 'learner@example.test',
        videoTitle: 'Video không tồn tại',
        videoViewLimit: null,
      },
    ]);
  });
});
