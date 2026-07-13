/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST as createAdminRecord, PATCH as updateAdminRecord } from '@/app/api/admin/create/route';
import { POST as mutateAdminTable } from '@/app/api/admin/table-action/route';
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

jest.mock('@/lib/redis', () => ({
  invalidateCache: jest.fn(),
  invalidateCacheKey: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    course: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedRevokeSession = revokeSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  user: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  course: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  enrollment: {
    findMany: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  session: { findMany: jest.Mock; deleteMany: jest.Mock };
};

function jsonRequest(body: unknown, method = 'POST') {
  return new Request('http://localhost.test/api/admin/create', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('typed admin mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
    });
  });

  test('user creation lets Prisma generate the MongoDB ObjectId', async () => {
    mockedPrisma.user.create.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      name: 'Learner',
      email: 'learner@example.test',
      role: 'USER',
    });

    const response = await createAdminRecord(
      jsonRequest({
        table: 'user',
        data: {
          name: ' Learner ',
          email: ' Learner@Example.Test ',
          role: 'USER',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Learner',
        email: 'learner@example.test',
        role: 'USER',
      },
    });
    const createData = mockedPrisma.user.create.mock.calls[0][0].data;
    expect(createData).not.toHaveProperty('id');
    expect(createData).not.toHaveProperty('updatedAt');
  });

  test('course edit updates the advertised fields', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue(null);
    mockedPrisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'Updated course',
      published: true,
      thumbnail: null,
      accessType: 'VERIFY',
    });

    const response = await updateAdminRecord(
      jsonRequest(
        {
          table: 'course',
          id: 'course-1',
          data: {
            title: ' Updated course ',
            thumbnail: '',
            published: true,
            accessType: 'VERIFY',
          },
        },
        'PATCH'
      )
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: {
        title: 'Updated course',
        thumbnail: null,
        published: true,
        accessType: 'VERIFY',
      },
    });
  });

  test('user soft-delete revokes and removes active database sessions', async () => {
    mockedPrisma.session.findMany.mockResolvedValue([
      { sessionToken: 'token-1' },
      { sessionToken: 'token-2' },
    ]);
    mockedPrisma.session.deleteMany.mockResolvedValue({ count: 2 });
    mockedPrisma.user.updateMany.mockResolvedValue({ count: 1 });
    mockedRevokeSession.mockResolvedValue({ redis: true, broadcast: 0 });

    const response = await mutateAdminTable(
      jsonRequest({
        table: 'user',
        ids: ['user-1'],
        action: 'delete',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedRevokeSession).toHaveBeenCalledTimes(2);
    expect(mockedPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: { in: ['user-1'] } },
    });
    expect(mockedPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['user-1'] } },
      data: { isDeleted: true },
    });
    expect(body).toEqual({ success: true, count: 1 });
  });

  test('generic table mutation rejects models without soft-delete support', async () => {
    const response = await mutateAdminTable(
      jsonRequest({ table: 'ticket', ids: ['ticket-1'], action: 'delete' })
    );

    expect(response.status).toBe(400);
  });
});
