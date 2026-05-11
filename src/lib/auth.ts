import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { revokeAllSessionsForUser } from '@/lib/session-revocation';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
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
        async signIn({ user, account, profile }) {
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

            // Allow new user creation if whitelisted
            // Note: For new users, name will be set by NextAuth from Google profile initially,
            // but we can override it here if we want to be strict, or let the next sign-in catch it.
            // However, NextAuth creates the user AFTER this callback returns true.
            // To force the name for NEW users, we might need to handle the creation event or use the `profile` callback
            // (but `profile` callback doesn't have access to DB easily without creating circular deps or complexity).
            // A simpler approach for new users: relying on the fact that Google name is usually okay, 
            // OR we can't easily update it BEFORE creation. 
            // But wait, if we return true, NextAuth creates the user.
            // The `events.createUser` callback is better for this, but `signIn` is blocking.

            // Let's just return true here. If they really want to enforce it immediately for new users,
            // we'd need to hook into `events` or accept that first login might have Google name until next refresh.
            // BUT, for existing users (which is the main case), the logic above handles it.
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
