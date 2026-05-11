import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get all tickets with logs and browser info
        const tickets = await prisma.ticket.findMany({
            where: {

            },
            select: {
                id: true,
                createdAt: true,
                consoleLogs: true,
                browserInfo: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Process analytics data
        const errorMessages = new Map<string, number>();
        const browserCounts = new Map<string, number>();
        const osCounts = new Map<string, number>();
        const dailyErrors = new Map<string, number>();

        tickets.forEach(ticket => {
            // Extract errors from console logs
            if (ticket.consoleLogs && Array.isArray(ticket.consoleLogs)) {
                ticket.consoleLogs.forEach((log: any) => {
                    if (log.level === 'error') {
                        // Count error messages
                        const message = log.message.substring(0, 100); // Truncate long messages
                        errorMessages.set(message, (errorMessages.get(message) || 0) + 1);

                        // Count daily errors
                        const date = new Date(ticket.createdAt).toISOString().split('T')[0];
                        dailyErrors.set(date, (dailyErrors.get(date) || 0) + 1);
                    }
                });
            }

            // Extract browser info
            if (ticket.browserInfo) {
                const browserInfo = ticket.browserInfo as any;
                const userAgent = browserInfo.userAgent || '';

                // Detect browser
                let browser = 'Unknown';
                if (userAgent.includes('Edg')) browser = 'Edge';
                else if (userAgent.includes('Chrome')) browser = 'Chrome';
                else if (userAgent.includes('Firefox')) browser = 'Firefox';
                else if (userAgent.includes('Safari')) browser = 'Safari';

                browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1);

                // Detect OS
                let os = 'Unknown';
                if (userAgent.includes('Windows')) os = 'Windows';
                else if (userAgent.includes('Mac OS')) os = 'macOS';
                else if (userAgent.includes('Android')) os = 'Android';
                else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
                else if (userAgent.includes('Linux')) os = 'Linux';

                osCounts.set(os, (osCounts.get(os) || 0) + 1);
            }
        });

        // Convert maps to arrays and sort
        const topErrors = Array.from(errorMessages.entries())
            .map(([message, count]) => ({ message, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 errors

        const browserBreakdown = Array.from(browserCounts.entries())
            .map(([browser, count]) => ({ browser, count }))
            .sort((a, b) => b.count - a.count);

        const osBreakdown = Array.from(osCounts.entries())
            .map(([os, count]) => ({ os, count }))
            .sort((a, b) => b.count - a.count);

        const errorTrends = Array.from(dailyErrors.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            topErrors,
            browserBreakdown,
            osBreakdown,
            errorTrends,
            totalTickets: tickets.length,
            totalErrors: Array.from(errorMessages.values()).reduce((a, b) => a + b, 0),
        });
    } catch (error) {
        console.error('Console analytics fetch error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
