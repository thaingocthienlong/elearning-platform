import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as JsonRecord
        : null;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const tickets = await prisma.ticket.findMany({
            select: {
                id: true,
                createdAt: true,
                consoleLogs: true,
                browserInfo: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const ticketsWithLogs = tickets.filter(
            (ticket) => Array.isArray(ticket.consoleLogs) && ticket.consoleLogs.length > 0
        );
        const errorMessages = new Map<string, number>();
        const browserCounts = new Map<string, number>();
        const osCounts = new Map<string, number>();
        const dailyErrors = new Map<string, number>();

        ticketsWithLogs.forEach((ticket) => {
            (ticket.consoleLogs as unknown[]).forEach((value) => {
                const log = asRecord(value);
                if (log?.level !== 'error' || typeof log.message !== 'string') return;
                const message = log.message.substring(0, 100);
                errorMessages.set(message, (errorMessages.get(message) || 0) + 1);
                const date = ticket.createdAt.toISOString().split('T')[0];
                dailyErrors.set(date, (dailyErrors.get(date) || 0) + 1);
            });

            const browserInfo = asRecord(ticket.browserInfo);
            const userAgent = typeof browserInfo?.userAgent === 'string' ? browserInfo.userAgent : '';
            let browser = 'Unknown';
            if (userAgent.includes('Edg')) browser = 'Edge';
            else if (userAgent.includes('Chrome')) browser = 'Chrome';
            else if (userAgent.includes('Firefox')) browser = 'Firefox';
            else if (userAgent.includes('Safari')) browser = 'Safari';
            browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1);

            let os = 'Unknown';
            if (userAgent.includes('Windows')) os = 'Windows';
            else if (userAgent.includes('Mac OS')) os = 'macOS';
            else if (userAgent.includes('Android')) os = 'Android';
            else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
            else if (userAgent.includes('Linux')) os = 'Linux';
            osCounts.set(os, (osCounts.get(os) || 0) + 1);
        });

        const topErrors = Array.from(errorMessages.entries())
            .map(([message, count]) => ({ message, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
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
            totalTickets: ticketsWithLogs.length,
            totalErrors: Array.from(errorMessages.values()).reduce((a, b) => a + b, 0),
            uniqueErrorCount: errorMessages.size,
        });
    } catch (error) {
        console.error('Console analytics fetch error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
