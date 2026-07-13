/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { deleteTencentMedia } from '@/lib/tencent/vod';
import { DELETE } from '@/app/api/admin/videos/[videoId]/route';
import { GET } from '@/app/api/admin/videos/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/tencent/vod', () => ({
  deleteTencentMedia: jest.fn(),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  video: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
};
const mockedDeleteTencentMedia = deleteTencentMedia as jest.Mock;

const adminSession = {
  user: {
    id: 'admin-1',
    role: 'ADMIN',
  },
};

function deleteVideo(videoId = '64b7f0000000000000000002') {
  return DELETE(
    new Request(`http://localhost/api/admin/videos/${videoId}`, { method: 'DELETE' }),
    { params: Promise.resolve({ videoId }) }
  );
}

describe('Tencent admin video deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue(adminSession);
    mockedPrisma.video.update.mockResolvedValue({ id: '64b7f0000000000000000002' });
  });

  test('deletes Tencent media before soft-deleting the local video', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: '64b7f0000000000000000002',
      isDeleted: false,
      tencentFileId: 'tencent-file-id',
      tencentDeletedAt: null,
    });
    mockedDeleteTencentMedia.mockResolvedValue({});

    const response = await deleteVideo();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      providerDeleted: true,
      alreadyDeleted: false,
    });
    expect(mockedDeleteTencentMedia).toHaveBeenCalledWith('tencent-file-id');
    expect(mockedPrisma.video.update).toHaveBeenCalledWith({
      where: { id: '64b7f0000000000000000002' },
      data: {
        isDeleted: true,
        published: false,
        dashUrl: null,
        hlsUrl: null,
        hlsUrlClear: null,
        tencentStatus: 'DELETED',
        tencentDeletedAt: expect.any(Date),
      },
    });
    expect(mockedDeleteTencentMedia.mock.invocationCallOrder[0])
      .toBeLessThan(mockedPrisma.video.update.mock.invocationCallOrder[0]);
  });

  test('does not change local state when Tencent deletion fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: '64b7f0000000000000000002',
      isDeleted: false,
      tencentFileId: 'tencent-file-id',
      tencentDeletedAt: null,
    });
    mockedDeleteTencentMedia.mockRejectedValue(new Error('provider unavailable'));

    const response = await deleteVideo();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toContain('local video was not deleted');
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test('soft-deletes local pending videos that have no Tencent file id', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: '64b7f0000000000000000002',
      isDeleted: false,
      tencentFileId: null,
      tencentDeletedAt: null,
    });

    const response = await deleteVideo();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providerDeleted).toBe(false);
    expect(mockedDeleteTencentMedia).not.toHaveBeenCalled();
    expect(mockedPrisma.video.update).toHaveBeenCalledTimes(1);
  });

  test('returns success without repeating an already completed deletion', async () => {
    mockedPrisma.video.findUnique.mockResolvedValue({
      id: '64b7f0000000000000000002',
      isDeleted: true,
      tencentFileId: 'tencent-file-id',
      tencentDeletedAt: new Date('2026-07-13T00:00:00.000Z'),
    });

    const response = await deleteVideo();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      providerDeleted: true,
      alreadyDeleted: true,
    });
    expect(mockedDeleteTencentMedia).not.toHaveBeenCalled();
    expect(mockedPrisma.video.update).not.toHaveBeenCalled();
  });

  test('rejects non-admin callers', async () => {
    mockedGetServerSession.mockResolvedValue({ user: { role: 'USER' } });

    const response = await deleteVideo();

    expect(response.status).toBe(401);
    expect(mockedPrisma.video.findUnique).not.toHaveBeenCalled();
  });

  test('rejects malformed video ids before querying the database', async () => {
    const response = await deleteVideo('not-an-object-id');

    expect(response.status).toBe(400);
    expect(mockedPrisma.video.findUnique).not.toHaveBeenCalled();
  });

  test('admin video list excludes soft-deleted rows', async () => {
    mockedPrisma.video.findMany.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isDeleted: false },
    }));
  });
});
