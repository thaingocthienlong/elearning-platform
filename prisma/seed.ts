import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding ...');

    // Clean up existing data (optional, be careful in prod)
    // await prisma.video.deleteMany();
    // await prisma.course.deleteMany();

    const course = await prisma.course.create({
        data: {
            title: 'Test Course: Big Buck Bunny',
            published: true,
            thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg',
            Video: {
                create: [
                    {
                        title: 'Big Buck Bunny (DASH)',
                        description: 'A public test stream for DASH playback.',
                        published: true,
                        position: 1,
                        dashUrl: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
                        // No DRM for this test
                    },
                ],
            },
        },
    });

    console.log(`Created course with id: ${course.id}`);

    // Create a test user
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            id: 'user_test_123',
            email: 'test@example.com',
            name: 'Test User',
            image: 'https://github.com/shadcn.png',
            updatedAt: new Date(),
        },
    });
    console.log(`Created/Found user: ${user.email}`);

    // Enroll user in the course
    const enrollment = await prisma.enrollment.upsert({
        where: {
            userId_courseId: {
                userId: user.id,
                courseId: course.id,
            },
        },
        update: {},
        create: {
            userId: user.id,
            courseId: course.id,
        },
    });
    console.log(`Enrolled user in course: ${enrollment.id}`);

    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
