/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET, POST } from '@/app/api/admin/video-access/route';

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        videoAccess: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        video: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        course: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
    videoAccess: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
        create: jest.Mock;
    };
    video: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
    };
    course: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
    };
    user: {
        findUnique: jest.Mock;
    };
};

describe('admin video access orphan relation resilience', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetServerSession.mockResolvedValue({
            user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
        });
    });

    test('GET preserves relation keys when the video or its course was deleted', async () => {
        mockedPrisma.videoAccess.findMany.mockImplementation(async (args) => {
            if (args?.include?.Video) {
                throw new Error('Inconsistent query result: Field Video is required to return data');
            }

            return [
                {
                    id: 'access-1',
                    userId: 'user-1',
                    videoId: 'video-1',
                    grantedAt: new Date('2026-07-13T00:00:00.000Z'),
                    expiresAt: null,
                    validFrom: null,
                    validUntil: null,
                },
                {
                    id: 'access-2',
                    userId: 'user-1',
                    videoId: 'missing-video',
                    grantedAt: new Date('2026-07-12T00:00:00.000Z'),
                    expiresAt: null,
                    validFrom: null,
                    validUntil: null,
                },
            ];
        });
        mockedPrisma.video.findMany.mockResolvedValue([
            { id: 'video-1', title: 'Orphan course video', courseId: 'missing-course' },
        ]);
        mockedPrisma.course.findMany.mockResolvedValue([]);

        const response = await GET(
            new Request('http://localhost.test/api/admin/video-access?userId=user-1') as never
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual([
            expect.objectContaining({
                id: 'access-1',
                Video: {
                    id: 'video-1',
                    title: 'Orphan course video',
                    Course: null,
                },
            }),
            expect.objectContaining({
                id: 'access-2',
                Video: null,
            }),
        ]);
    });

    test('POST builds its response without required-relation includes', async () => {
        mockedPrisma.videoAccess.findUnique.mockResolvedValue(null);
        mockedPrisma.videoAccess.create.mockImplementation(async (args) => {
            if (args?.include?.Video || args?.include?.User) {
                throw new Error('Inconsistent query result: required relation is missing');
            }

            return {
                id: 'access-1',
                userId: 'missing-user',
                videoId: 'video-1',
            };
        });
        mockedPrisma.video.findUnique.mockResolvedValue({
            title: 'Orphan course video',
            courseId: 'missing-course',
        });
        mockedPrisma.user.findUnique.mockResolvedValue(null);
        mockedPrisma.course.findUnique.mockResolvedValue(null);

        const response = await POST(
            new Request('http://localhost.test/api/admin/video-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'missing-user', videoId: 'video-1' }),
            }) as never
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            id: 'access-1',
            userId: 'missing-user',
            videoId: 'video-1',
            Video: {
                title: 'Orphan course video',
                Course: null,
            },
            User: null,
        });
    });
});
