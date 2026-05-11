/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/admin/whitelist/route';

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
    },
    course: {
      findFirst: jest.fn(),
    },
    enrollment: {
      create: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  allowedEmail: { create: jest.Mock };
  course: { findFirst: jest.Mock };
  enrollment: { create: jest.Mock };
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
};

function whitelistRequest(body: Record<string, unknown>) {
  return new Request('http://localhost.test/api/admin/whitelist', {
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
    mockedPrisma.course.findFirst.mockResolvedValue({ id: '69feb78ca9887a7075ceebc7' });
    mockedPrisma.enrollment.create.mockResolvedValue({ id: 'enrollment-id' });
    mockedPrisma.user.create.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
      email: 'learner@example.test',
    });
    mockedPrisma.user.findUnique.mockResolvedValue(null);
  });

  test('requires an admin session', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const response = await POST(whitelistRequest({ email: 'learner@example.test' }));

    expect(response.status).toBe(401);
    expect(mockedPrisma.allowedEmail.create).not.toHaveBeenCalled();
  });

  test('creates a placeholder user without overriding Mongo ObjectId when enrolling in a course', async () => {
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
    expect(mockedPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'longthien0903@gmail.com',
        name: 'Long Thien',
        updatedAt: expect.any(Date),
      },
    });
    expect(mockedPrisma.enrollment.create).toHaveBeenCalledWith({
      data: {
        userId: '507f1f77bcf86cd799439011',
        courseId: '69feb78ca9887a7075ceebc7',
      },
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
});
