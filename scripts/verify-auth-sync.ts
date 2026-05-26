import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAuthSync() {
    console.log('Starting verification...');

    const testEmail = `test-verify-${Date.now()}@example.com`;
    const whitelistName = "Whitelisted Name " + Date.now();
    const initialUserName = "Google Name " + Date.now();

    try {
        // 1. Setup: Create AllowedEmail
        console.log(`Creating AllowedEmail for ${testEmail}...`);
        await prisma.allowedEmail.create({
            data: {
                email: testEmail,
                fullname: whitelistName,
            }
        });

        // 2. Setup: Create User
        console.log(`Creating User for ${testEmail}...`);
        await prisma.user.create({
            data: {
                email: testEmail,
                name: initialUserName,
            }
        });

        // 3. Simulate Logic
        console.log('Simulating signIn logic...');
        const [existingUser, whitelisted] = await Promise.all([
            prisma.user.findUnique({ where: { email: testEmail } }),
            prisma.allowedEmail.findUnique({ where: { email: testEmail } }),
        ]);

        if (existingUser && !existingUser.isDeleted) {
            if (whitelisted && whitelisted.fullname && existingUser.name !== whitelisted.fullname) {
                console.log(`Updating user name from "${existingUser.name}" to "${whitelisted.fullname}"...`);
                await prisma.user.update({
                    where: { email: testEmail },
                    data: { name: whitelisted.fullname },
                });
            } else {
                console.log('No update needed (condition not met).');
            }
        }

        // 4. Verify
        const updatedUser = await prisma.user.findUnique({ where: { email: testEmail } });
        console.log('Final User Name:', updatedUser?.name);

        if (updatedUser?.name === whitelistName) {
            console.log('SUCCESS: User name was updated to match whitelist.');
        } else {
            console.error(`FAILURE: User name is "${updatedUser?.name}", expected "${whitelistName}".`);
            process.exit(1);
        }

    } catch (e) {
        console.error('Error during verification:', e);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await prisma.user.deleteMany({ where: { email: testEmail } });
        await prisma.allowedEmail.deleteMany({ where: { email: testEmail } });
        await prisma.$disconnect();
    }
}

verifyAuthSync();
