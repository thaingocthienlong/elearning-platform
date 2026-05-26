import { prisma } from '@/lib/prisma';
import { syncVideoWithAxinom } from '@/lib/axinom-sync';

async function main() {
    console.log('🧪 Starting Sync Logic Verification...');

    // 1. Create a dummy video for testing
    console.log('\n1. Creating dummy video...');
    const video = await prisma.video.create({
        data: {
            title: 'Unit Test Video',
            published: false,
            description: 'Test video for sync logic verification',
            Course: {
                create: {
                    title: 'Test Course',
                    published: false
                }
            }
        }
    });
    console.log(`   Created video: ${video.id}`);

    try {
        // 2. Test Sync (Should fail gracefully - No Axinom ID)
        console.log('\n2. Testing Sync (Expect NO_AXINOM_ID)...');
        const result1 = await syncVideoWithAxinom(video.id);
        console.log('   Result:', result1);

        if (result1.status === 'NO_AXINOM_ID') {
            console.log('   ✅ Passed: Correctly identified missing Axinom ID');
        } else {
            console.error('   ❌ Failed: Unexpected status');
        }

        // 3. Update with Fake Axinom ID
        console.log('\n3. Updating with Fake Axinom ID...');
        await prisma.video.update({
            where: { id: video.id },
            data: { description: 'axinom-id:00000000-0000-0000-0000-000000000000' }
        });

        // 4. Test Sync (Should fail - Axinom API error)
        console.log('\n4. Testing Sync (Expect API Error)...');
        const result2 = await syncVideoWithAxinom(video.id);
        console.log('   Result:', result2);

        if (!result2.success && result2.error) {
            console.log('   ✅ Passed: Correctly handled API error (invalid ID)');
        } else {
            console.error('   ❌ Failed: Should have failed with API error');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await prisma.video.delete({ where: { id: video.id } });
        // Note: Course cleanup omitted for safety
        console.log('   Deleted test video');
    }
}

main();
