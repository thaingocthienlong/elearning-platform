/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/admin/import/route';

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        course: {
            findFirst: jest.fn(),
        },
        user: {
            upsert: jest.fn(),
        },
        enrollment: {
            upsert: jest.fn(),
        },
    },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
    course: { findFirst: jest.Mock };
    user: { upsert: jest.Mock };
    enrollment: { upsert: jest.Mock };
};

function importRequest(body: unknown) {
    return new Request('http://localhost.test/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }) as never;
}

describe('admin enrollment import', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetServerSession.mockResolvedValue({
            user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
        });
    });

    test('keeps admin authorization at the route boundary', async () => {
        mockedGetServerSession.mockResolvedValue({
            user: { id: 'user-1', email: 'user@example.test', role: 'USER' },
        });

        const response = await POST(importRequest({ Course: ['user@example.test'] }));

        expect(response.status).toBe(401);
        expect(mockedPrisma.course.findFirst).not.toHaveBeenCalled();
    });

    test('rejects malformed import data before querying the database', async () => {
        const response = await POST(importRequest({ Course: ['not-an-email'] }));
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe('Validation failed');
        expect(mockedPrisma.course.findFirst).not.toHaveBeenCalled();
        expect(mockedPrisma.user.upsert).not.toHaveBeenCalled();
    });

    test('uses Mongo ObjectId defaults and restores users and enrollments', async () => {
        mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
        mockedPrisma.user.upsert.mockResolvedValue({ id: 'user-1' });
        mockedPrisma.enrollment.upsert.mockResolvedValue({ id: 'enrollment-1' });

        const response = await POST(
            importRequest({ 'Course One': [' Deleted.User@Example.COM ', 'deleted.user@example.com'] })
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            success: ['Enrolled deleted.user@example.com in Course One'],
            errors: [],
        });
        expect(mockedPrisma.user.upsert).toHaveBeenCalledTimes(1);
        expect(mockedPrisma.user.upsert).toHaveBeenCalledWith({
            where: { email: 'deleted.user@example.com' },
            update: { isDeleted: false },
            create: {
                email: 'deleted.user@example.com',
                name: 'deleted.user',
            },
        });
        expect(mockedPrisma.user.upsert.mock.calls[0][0].create).not.toHaveProperty('id');
        expect(mockedPrisma.enrollment.upsert).toHaveBeenCalledWith({
            where: {
                userId_courseId: {
                    userId: 'user-1',
                    courseId: 'course-1',
                },
            },
            update: {
                isDeleted: false,
                enrolledAt: expect.any(Date),
            },
            create: {
                userId: 'user-1',
                courseId: 'course-1',
                enrolledAt: expect.any(Date),
            },
        });
    });
});
