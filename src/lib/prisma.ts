import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    // Optimize for serverless: Limit connections per lambda instance
    // connection_limit=5 allows concurrent queries within a request (e.g., watch page)
    // while preventing "Too many connections" errors when Vercel scales up
    const url = process.env.DATABASE_URL;
    let datasources = {};

    if (url) {
        datasources = {
            db: {
                url: url,
            },
        };
    }

    return new PrismaClient({
        datasources,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
