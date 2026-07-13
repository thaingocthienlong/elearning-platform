/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/admin/whitelist/route';
import { POST as bulkPost } from '@/app/api/admin/whitelist/bulk/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    allowedEmail: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    course: {
      findFirst: jest.fn(),
    },
    enrollment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  allowedEmail: { create: jest.Mock; findUnique: jest.Mock };
  course: { findFirst: jest.Mock };
  enrollment: { create: jest.Mock; findUnique: jest.Mock; upsert: jest.Mock };
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    upsert: jest.Mock;
  };
  $transaction: jest.Mock;
};

function whitelistRequest(body: Record<string, unknown>) {
  return new Request('http://localhost.test/api/admin/whitelist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function bulkWhitelistRequest(body: Record<string, unknown>) {
  return new Request('http://localhost.test/api/admin/whitelist/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin whitelist creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: 'admin-user-id',
        role: 'ADMIN',
      },
    });
    mockedPrisma.allowedEmail.create.mockResolvedValue({
      id: 'allowed-email-id',
      email: 'learner@example.test',
    });
    mockedPrisma.allowedEmail.findUnique.mockResolvedValue(null);
    mockedPrisma.course.findFirst.mockResolvedValue({ id: '69feb78ca9887a7075ceebc7' });
    mockedPrisma.enrollment.create.mockResolvedValue({ id: 'enrollment-id' });
    mockedPrisma.enrollment.findUnique.mockResolvedValue(null);
    mockedPrisma.enrollment.upsert.mockResolvedValue({ id: 'enrollment-id', isDeleted: false });
    mockedPrisma.user.create.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      email: 'learner@example.test',
      isDeleted: false,
    });
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.update.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.user.upsert.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      email: 'learner@example.test',
      isDeleted: false,
    });
    mockedPrisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof mockedPrisma) => Promise<unknown>) => callback(mockedPrisma)
    );
  });

  test('requires an admin session', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const response = await POST(whitelistRequest({ email: 'learner@example.test' }));

    expect(response.status).toBe(401);
    expect(mockedPrisma.allowedEmail.create).not.toHaveBeenCalled();
  });

  test('atomically creates or reactivates a user and enrollment for a course', async () => {
    const response = await POST(
      whitelistRequest({
        fullname: 'Long Thien',
        phone: '0123456789',
        email: 'LongThien0903@gmail.com',
        notes: '',
        courseId: '69feb78ca9887a7075ceebc7',
      })
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.course.findFirst).toHaveBeenCalledWith({
      where: {
        id: '69feb78ca9887a7075ceebc7',
        isDeleted: false,
      },
      select: { id: true },
    });
    expect(mockedPrisma.allowedEmail.create).toHaveBeenCalledWith({
      data: {
        fullname: 'Long Thien',
        phone: '0123456789',
        email: 'longthien0903@gmail.com',
        notes: '',
        createdBy: 'admin-user-id',
      },
    });
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.user.upsert).toHaveBeenCalledWith({
      where: { email: 'longthien0903@gmail.com' },
      create: {
          email: 'longthien0903@gmail.com',
          name: 'Long Thien',
          updatedAt: expect.any(Date),
      },
      update: { isDeleted: false },
    });
    expect(mockedPrisma.enrollment.upsert).toHaveBeenCalledWith({
      where: {
        userId_courseId: {
          userId: '507f1f77bcf86cd799439011',
          courseId: '69feb78ca9887a7075ceebc7',
        },
      },
      create: {
        userId: '507f1f77bcf86cd799439011',
        courseId: '69feb78ca9887a7075ceebc7',
      },
      update: { isDeleted: false },
    });
  });

  test('rejects a missing course before creating whitelist records', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue(null);

    const response = await POST(
      whitelistRequest({
        email: 'learner@example.test',
        courseId: '69feb78ca9887a7075ceebc7',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Course not found');
    expect(mockedPrisma.allowedEmail.create).not.toHaveBeenCalled();
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
    expect(mockedPrisma.enrollment.create).not.toHaveBeenCalled();
  });

  test('returns failure when enrollment fails instead of reporting whitelist success', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedPrisma.enrollment.upsert.mockRejectedValueOnce(new Error('enrollment unavailable'));

    const response = await POST(
      whitelistRequest({
        email: 'learner@example.test',
        courseId: '69feb78ca9887a7075ceebc7',
      })
    );

    expect(response.status).toBe(500);
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

describe('admin whitelist bulk import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: 'admin-user-id',
        role: 'ADMIN',
      },
    });
    mockedPrisma.allowedEmail.create.mockResolvedValue({
      id: 'allowed-email-id',
      email: 'learner@example.test',
    });
    mockedPrisma.allowedEmail.findUnique.mockResolvedValue(null);
    mockedPrisma.course.findFirst.mockResolvedValue({ id: '69feb78ca9887a7075ceebc7' });
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.user.update.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue(null);
    mockedPrisma.enrollment.upsert.mockResolvedValue({ id: 'enrollment-id', isDeleted: false });
    mockedPrisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof mockedPrisma) => Promise<unknown>) => callback(mockedPrisma)
    );
  });

  test('reports malformed rows per entry and continues importing valid rows', async () => {
    const response = await bulkPost(
      bulkWhitelistRequest({
        entries: [
          { fullname: 'Missing Email' },
          { fullname: 'Learner', email: ' Learner@Example.Test ' },
        ],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      whitelisted: 1,
      errors: ['Entry 1: a valid email is required'],
    });
    expect(mockedPrisma.allowedEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'learner@example.test' }),
    });
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test('reactivates soft-deleted users and enrollments', async () => {
    mockedPrisma.allowedEmail.findUnique.mockResolvedValue({ id: 'existing-allowed-email-id' });
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: true,
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({ isDeleted: true });

    const response = await bulkPost(
      bulkWhitelistRequest({
        entries: [{ email: 'learner@example.test' }],
        courseId: '69feb78ca9887a7075ceebc7',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: '507f1f77bcf86cd799439011' },
      data: { isDeleted: false },
    });
    expect(mockedPrisma.enrollment.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { isDeleted: false },
    }));
    expect(mockedPrisma.allowedEmail.create).not.toHaveBeenCalled();
    expect(body.duplicateWhitelist).toBe(1);
    expect(body.enrollmentsCreated).toBe(1);
    expect(body.duplicateEnrollments).toBe(0);
  });

  test('does not increment success counters when an enrolled entry transaction fails', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      isDeleted: false,
    });
    mockedPrisma.enrollment.upsert.mockRejectedValueOnce(new Error('enrollment unavailable'));

    const response = await bulkPost(
      bulkWhitelistRequest({
        entries: [{ email: 'learner@example.test' }],
        courseId: '69feb78ca9887a7075ceebc7',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.whitelisted).toBe(0);
    expect(body.enrollmentsCreated).toBe(0);
    expect(body.errors).toEqual(['learner@example.test: enrollment unavailable']);
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
