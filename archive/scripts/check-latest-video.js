const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestVideo() {
    const video = await prisma.video.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(video, null, 2));
}

checkLatestVideo()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
