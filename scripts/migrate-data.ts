
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Initialize Prisma (Connects to MongoDB via DATABASE_URL)
const prisma = new PrismaClient();

// Initialize Postgres Pool (Connects to Old Supabase DB)
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;

if (!OLD_DATABASE_URL) {
    console.error('❌ Error: OLD_DATABASE_URL environment variable is missing.');
    console.error('Please run with: OLD_DATABASE_URL="postgres://..." npx tsx scripts/migrate-data.ts');
    process.exit(1);
}

const pgPool = new Pool({
    connectionString: OLD_DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase/Neon usually
});

// Maps to store Old ID -> New ID
const userMap = new Map<string, string>();
const courseMap = new Map<string, string>();
const videoMap = new Map<string, string>();

async function migrate() {
    try {
        console.log('🚀 Starting migration...');
        
        // 1. Migrate Users
        console.log('📦 Migrating Users...');
        const users = await pgPool.query('SELECT * FROM "User"');
        
        for (const row of users.rows) {
            const newUser = await prisma.user.create({
                data: {
                    name: row.name,
                    email: row.email,
                    emailVerified: row.emailVerified,
                    image: row.image,
                    role: row.role as any,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    isDeleted: row.isDeleted ?? false,
                }
            });
            userMap.set(row.id, newUser.id);
        }
        console.log(`✅ Migrated ${users.rows.length} users.`);

        // 2. Migrate Accounts
        console.log('📦 Migrating Accounts...');
        const accounts = await pgPool.query('SELECT * FROM "Account"');
        for (const row of accounts.rows) {
            const newUserId = userMap.get(row.userId);
            if (!newUserId) continue;

            await prisma.account.create({
                data: {
                    userId: newUserId,
                    type: row.type,
                    provider: row.provider,
                    providerAccountId: row.providerAccountId,
                    refresh_token: row.refresh_token,
                    access_token: row.access_token,
                    expires_at: row.expires_at,
                    token_type: row.token_type,
                    scope: row.scope,
                    id_token: row.id_token,
                    session_state: row.session_state,
                }
            });
        }
        console.log(`✅ Migrated ${accounts.rows.length} accounts.`);

        // 3. Migrate Courses
        console.log('📦 Migrating Courses...');
        const courses = await pgPool.query('SELECT * FROM "Course"');
        for (const row of courses.rows) {
            const newCourse = await prisma.course.create({
                data: {
                    title: row.title,
                    thumbnail: row.thumbnail,
                    published: row.published,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    isDeleted: row.isDeleted ?? false,
                }
            });
            courseMap.set(row.id, newCourse.id);
        }
        console.log(`✅ Migrated ${courses.rows.length} courses.`);

        // 4. Migrate Videos
        console.log('📦 Migrating Videos...');
        const videos = await pgPool.query('SELECT * FROM "Video"');
        for (const row of videos.rows) {
            const newCourseId = courseMap.get(row.courseId);
            if (!newCourseId) continue;

            const newVideo = await prisma.video.create({
                data: {
                    title: row.title,
                    description: row.description,
                    duration: row.duration,
                    position: row.position,
                    published: row.published,
                    r2Key: row.r2Key,
                    dashUrl: row.dashUrl,
                    hlsUrl: row.hlsUrl,
                    hlsUrlClear: row.hlsUrlClear,
                    drmKeyId: row.drmKeyId,
                    axinomIdClear: row.axinomIdClear,
                    viewLimit: row.viewLimit,
                    courseId: newCourseId,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    isDeleted: row.isDeleted ?? false,
                }
            });
            videoMap.set(row.id, newVideo.id);
        }
        console.log(`✅ Migrated ${videos.rows.length} videos.`);

        // 5. Migrate Enrollments
        console.log('📦 Migrating Enrollments...');
        const enrollments = await pgPool.query('SELECT * FROM "Enrollment"');
        let enrollmentCount = 0;
        for (const row of enrollments.rows) {
            const newUserId = userMap.get(row.userId);
            const newCourseId = courseMap.get(row.courseId);
            if (!newUserId || !newCourseId) continue;

            await prisma.enrollment.create({
                data: {
                    userId: newUserId,
                    courseId: newCourseId,
                    enrolledAt: row.enrolledAt,
                    isDeleted: row.isDeleted ?? false,
                }
            });
            enrollmentCount++;
        }
        console.log(`✅ Migrated ${enrollmentCount} enrollments.`);

        // 6. Migrate WatchRecords
        console.log('📦 Migrating WatchRecords...');
        const watchRecords = await pgPool.query('SELECT * FROM "WatchRecord"');
        let watchRecordCount = 0;
        for (const row of watchRecords.rows) {
            const newUserId = userMap.get(row.userId);
            const newVideoId = videoMap.get(row.videoId);
            if (!newUserId || !newVideoId) continue;

            // Check if record already exists (duplicates possible if script rerun partial)
            const exists = await prisma.watchRecord.findUnique({
                where: {
                    userId_videoId: {
                        userId: newUserId,
                        videoId: newVideoId
                    }
                }
            });

            if (!exists) {
                await prisma.watchRecord.create({
                    data: {
                        userId: newUserId,
                        videoId: newVideoId,
                        lastPosition: row.lastPosition,
                        completedAt: row.completedAt,
                        viewCount: row.viewCount,
                        viewLimit: row.viewLimit,
                        lastViewedAt: row.lastViewedAt,
                    }
                });
                watchRecordCount++;
            }
        }
        console.log(`✅ Migrated ${watchRecordCount} watch records.`);

        // 7. Migrate Sessions (Optional, but good for UX)
        console.log('📦 Migrating Sessions...');
        const sessions = await pgPool.query('SELECT * FROM "Session"');
        let sessionCount = 0;
        for (const row of sessions.rows) {
            const newUserId = userMap.get(row.userId);
            if (!newUserId) continue;

            await prisma.session.create({
                data: {
                    sessionToken: row.sessionToken, // Token remains valid!
                    userId: newUserId,
                    expires: row.expires,
                    fingerprint: row.fingerprint,
                    ipAddress: row.ipAddress,
                    userAgent: row.userAgent,
                    lastActive: row.lastActive,
                }
            });
            sessionCount++;
        }
        console.log(`✅ Migrated ${sessionCount} sessions.`);

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await prisma.$disconnect();
        await pgPool.end();
    }
}

migrate();
