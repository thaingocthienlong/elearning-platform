import { NextAuthOptions } from 'next-auth';
import type { Adapter, AdapterUser } from 'next-auth/adapters';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { revokeAllSessionsForUser } from '@/lib/session-revocation';

const prismaAdapter = PrismaAdapter(prisma);

type NewAdapterUser = Omit<AdapterUser, 'id' | 'role'> &
    Partial<Pick<AdapterUser, 'role'>>;

async function createUserWithWhitelistName(
    user: NewAdapterUser
): Promise<AdapterUser> {
    const email = user.email.toLowerCase();
    const whitelisted = await prisma.allowedEmail.findUnique({
        where: { email },
    });

    const createUser = prismaAdapter.createUser;
    if (!createUser) {
        throw new Error('Prisma adapter is missing createUser');
    }

    return createUser({
        ...user,
        email,
        name: whitelisted?.fullname || user.name,
    });
}

const authAdapter: Adapter = {
    ...prismaAdapter,
    createUser: createUserWithWhitelistName,
};

export const authOptions: NextAuthOptions = {
    adapter: authAdapter,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    session: {
        strategy: 'database',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
        async signIn({ user }) {
            if (!user.email) {
                return false;
            }

            const email = user.email.toLowerCase();

            // Parallelize checks for performance
            const [existingUser, whitelisted] = await Promise.all([
                prisma.user.findUnique({ where: { email } }),
                prisma.allowedEmail.findUnique({ where: { email } }),
            ]);

            // If user exists and is soft-deleted
            if (existingUser && existingUser.isDeleted) {
                // If whitelisted, restore the user
                if (whitelisted) {
                    const updateData: { isDeleted: boolean; name?: string } = { isDeleted: false };

                    // Sync name from whitelist if available
                    if (whitelisted.fullname && existingUser.name !== whitelisted.fullname) {
                        updateData.name = whitelisted.fullname;
                    }

                    await prisma.user.update({
                        where: { email },
                        data: updateData,
                    });
                    // Revoke any old sessions before allowing sign-in
                    await revokeAllSessionsForUser(email, 'New login on another device');
                    return true;
                }
                // If not whitelisted, block
                return false;
            }

            // If user exists and is active, allow sign-in
            if (existingUser && !existingUser.isDeleted) {
                // Sync name from whitelist if available
                if (whitelisted && whitelisted.fullname && existingUser.name !== whitelisted.fullname) {
                    await prisma.user.update({
                        where: { email },
                        data: { name: whitelisted.fullname },
                    });
                }

                // Single-device login: revoke all previous sessions
                await revokeAllSessionsForUser(email, 'New login on another device');
                return true;
            }

            // For new users, check if email is whitelisted
            if (!whitelisted) {
                return false;
            }

            // The adapter create path stores whitelist fullname on first login.
            return true;
        },
        async session({ session, user }) {
            if (session.user && user) {
                session.user.id = user.id;
                session.user.role = user.role as 'USER' | 'ADMIN';
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
    },
    // OAuth debug output can include provider tokens; keep it opt-in even locally.
    debug: process.env.NEXTAUTH_DEBUG === 'true',
};
