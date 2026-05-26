import { prisma } from '@/lib/prisma';

async function main() {
    console.log('Checking users...');
    const users = await prisma.user.findMany();
    console.table(users.map(u => ({ id: u.id, email: u.email, role: u.role, name: u.name })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
