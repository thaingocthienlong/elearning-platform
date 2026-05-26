import { prisma } from '@/lib/prisma';

async function main() {
    console.log('🧪 Starting Enrollment Verification...');

    try {
        // 1. Setup: Upsert User and Course
        console.log('\n1. Creating/Updating test data...');

        const user = await prisma.user.upsert({
            where: { id: 'verify_enroll_user' },
            update: {},
            create: {
                id: 'verify_enroll_user',
                email: 'enroll_test@example.com',
                name: 'Enroll Test User',
                updatedAt: new Date(),
            }
        });

        const course = await prisma.course.upsert({
            where: { id: 'verify_enroll_course' },
            update: {},
            create: {
                id: 'verify_enroll_course',
                title: 'Enrollment Test Course',
                published: true
            }
        });
        console.log(`   User: ${user.id}, Course: ${course.id}`);

        // 2. Test Enrollment (Simulating API logic)
        console.log('\n2. Testing Enrollment...');

        // Check existing
        const existing = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: course.id
                }
            }
        });

        if (existing) {
            console.log('   ℹ️ Enrollment already exists (cleaning up first)');
            await prisma.enrollment.delete({
                where: {
                    userId_courseId: {
                        userId: user.id,
                        courseId: course.id
                    }
                }
            });
        }

        // Create enrollment
        const enrollment = await prisma.enrollment.create({
            data: {
                userId: user.id,
                courseId: course.id
            }
        });
        console.log(`   ✅ Enrolled successfully: ${enrollment.id}`);

        // 3. Verify Database State
        console.log('\n3. Verifying Database...');
        const verifyEnrollment = await prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: user.id,
                    courseId: course.id
                }
            }
        });

        if (verifyEnrollment) {
            console.log('   ✅ Database record confirmed');
        } else {
            console.error('   ❌ Failed: Record not found in DB');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        try {
            await prisma.enrollment.deleteMany({
                where: { userId: 'verify_enroll_user' }
            });
            await prisma.course.delete({ where: { id: 'verify_enroll_course' } });
            await prisma.user.delete({ where: { id: 'verify_enroll_user' } });
            console.log('   Deleted test data');
        } catch (e) {
            console.log('   Cleanup partial/failed', e);
        }
    }
}

main();
