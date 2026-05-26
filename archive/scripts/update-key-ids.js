const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateKeyIds() {
    const videoId = 'cmidx85230001sxe6awq0volx';

    // All unique key IDs from Axinom
    const keyIds = [
        'd7bff040-dc1e-4647-a758-9524f8141228', // SD
        '5283ec07-655d-42a4-9eee-39b5bb60219e', // audio
        '1b5ffdab-7702-49ef-9b49-4c87c071bced'  // HD
    ];

    const updated = await prisma.video.update({
        where: { id: videoId },
        data: {
            // Store as JSON string since we can only have one drmKeyId field
            // We'll parse this in the token generation
            drmKeyId: keyIds.join(',')
        }
    });

    console.log('Updated video with all key IDs:', updated.drmKeyId);
}

updateKeyIds()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
