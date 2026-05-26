const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUrls() {
    const videoId = 'cmidx85230001sxe6awq0volx'; // The latest video ID
    const dashUrl = 'https://c89cd24c6e47fa8e34ad78fc.blob.core.windows.net/video-output/37ZzoFCQmnXip4bgJWADYr/cmaf/manifest.mpd';
    const hlsUrl = 'https://c89cd24c6e47fa8e34ad78fc.blob.core.windows.net/video-output/37ZzoFCQmnXip4bgJWADYr/cmaf/manifest.m3u8';

    const updated = await prisma.video.update({
        where: { id: videoId },
        data: {
            dashUrl: dashUrl,
            hlsUrl: hlsUrl,
            published: true
        }
    });

    console.log('Updated Video:', JSON.stringify(updated, null, 2));
}

fixUrls()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
