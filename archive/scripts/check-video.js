const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVideo() {
    const video = await prisma.video.findUnique({
        where: { id: 'cmidhfkqy0001l9ztn31v61g1' }
    });
    console.log(JSON.stringify(video, null, 2));
}

checkVideo()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
