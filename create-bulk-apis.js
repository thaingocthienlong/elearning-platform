const fs = require('fs');
const path = require('path');

const bulkEnrollAPI = `import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    try {
        const { userIds, courseIds } = await request.json();
        if (!Array.isArray(userIds) || !Array.isArray(courseIds)) {
            return new NextResponse('Invalid input', { status: 400 });
        }
        let created = 0;
        let skipped = 0;
        for (const userId of userIds) {
            for (const courseId of courseIds) {
                try {
                    await prisma.enrollment.create({ data: { userId, courseId } });
                    created++;
                } catch (error) { skipped++; }
            }
        }
        return NextResponse.json({ created, skipped, total: userIds.length * courseIds.length });
    } catch (error) {
        console.error('Bulk enroll error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}`;

const bulkVideoAccessAPI = `import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    try {
        const { userIds, videoIds } = await request.json();
        if (!Array.isArray(userIds) || !Array.isArray(videoIds)) {
            return new NextResponse('Invalid input', { status: 400 });
        }
        let created = 0;
        let skipped = 0;
        for (const userId of userIds) {
            for (const videoId of videoIds) {
                try {
                    await prisma.videoAccess.create({ data: { userId, videoId } });
                    created++;
                } catch (error) { skipped++; }
            }
        }
        return NextResponse.json({ created, skipped, total: userIds.length * videoIds.length });
    } catch (error) {
        console.error('Bulk video access error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}`;

const dir1 = path.join(__dirname, 'app', 'api', 'admin', 'bulk-enroll');
fs.mkdirSync(dir1, { recursive: true });
fs.writeFileSync(path.join(dir1, 'route.ts'), bulkEnrollAPI);

const dir2 = path.join(__dirname, 'app', 'api', 'admin', 'bulk-video-access');
fs.mkdirSync(dir2, { recursive: true });
fs.writeFileSync(path.join(dir2, 'route.ts'), bulkVideoAccessAPI);

console.log('✅ Created bulk API routes');
