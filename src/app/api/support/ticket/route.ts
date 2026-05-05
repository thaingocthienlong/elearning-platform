import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRedisClient } from '@/lib/redis';
import {
    SUPPORT_LIMITS,
    boundedDiagnostics,
    getClientIp,
    optionalBoundedString,
    requireBoundedString,
} from '@/lib/request-security';
import { serverLog } from '@/lib/server-log';

const rateLimitStore = new Map<string, number>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

function checkLocalRateLimit(key: string): boolean {
    const now = Date.now();
    const lastSubmission = rateLimitStore.get(key);

    if (lastSubmission && now - lastSubmission < RATE_LIMIT_WINDOW) {
        return false; // Rate limited
    }

    return true; // Allowed
}

function updateLocalRateLimit(key: string): void {
    rateLimitStore.set(key, Date.now());
}

async function checkAndUpdateRateLimit(key: string): Promise<boolean> {
    const redis = getRedisClient();

    if (redis) {
        const existing = await redis.get(key);
        if (existing) {
            return false;
        }

        await redis.set(key, '1', { ex: RATE_LIMIT_WINDOW / 1000 });
        return true;
    }

    if (!checkLocalRateLimit(key)) {
        return false;
    }

    updateLocalRateLimit(key);
    return true;
}

// Clean up old entries periodically (optional, prevents memory leak)
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [email, timestamp] of rateLimitStore.entries()) {
        if (now - timestamp > RATE_LIMIT_WINDOW) {
            rateLimitStore.delete(email);
        }
    }
}, 60 * 60 * 1000); // Clean up every hour
cleanupInterval.unref?.();

async function verifyRecaptcha(token: string): Promise<boolean> {
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Test key
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

        const response = await fetch(verificationUrl, {
            method: 'POST',
        });

        const data = await response.json();
        return data.success === true;
    } catch (error) {
            serverLog.error('reCAPTCHA verification error', error);
        return false;
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !session.user.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { email, description, recaptchaToken, consoleLogs, browserInfo, pageUrl } = await request.json();
        const sessionEmail = session.user.email.toLowerCase();

        // Validate required fields
        if (!description) {
            return new NextResponse('Description is required', { status: 400 });
        }

        if (email && String(email).toLowerCase() !== sessionEmail) {
            return new NextResponse('Ticket email must match the authenticated session', { status: 400 });
        }

        const safeDescription = requireBoundedString(
            description,
            'Description',
            SUPPORT_LIMITS.descriptionBytes
        );
        const safeConsoleLogs = boundedDiagnostics(consoleLogs, 'Console logs');
        const safeBrowserInfo = boundedDiagnostics(browserInfo, 'Browser info');
        const safePageUrl = optionalBoundedString(pageUrl, 'Page URL', SUPPORT_LIMITS.pageUrlBytes);

        // Check User-Agent for iPad/Tablet to temporarily bypass reCAPTCHA
        const userAgent = request.headers.get('user-agent') || '';
        const isTablet = /iPad|Macintosh|Tablet|Android/i.test(userAgent) && ('ontouchend' in globalThis ? true : /iPad|Tablet/i.test(userAgent));

        // Note: Generic "Macintosh" check is included because iPads requesting desktop sites send "Macintosh"
        // This is a temporary workaround as requested.
        const isIpadOrTablet = /iPad|Tablet/i.test(userAgent) || (userAgent.includes('Macintosh') && userAgent.includes('Safari') && !userAgent.includes('Chrome'));

        // Verify reCAPTCHA token unless it's a tablet (temporary work-around)
        if (!isIpadOrTablet) {
            if (!recaptchaToken) {
                return new NextResponse('reCAPTCHA verification required', { status: 400 });
            }

            const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
            if (!isValidRecaptcha) {
                return new NextResponse('reCAPTCHA verification failed. Please try again.', { status: 400 });
            }
        }

        // Check if email is in whitelist
        const allowedEmail = await prisma.allowedEmail.findUnique({
            where: { email: sessionEmail },
        });

        if (!allowedEmail) {
            return new NextResponse(
                'Email not registered. Please use a registered email address or contact an administrator to get your email whitelisted.',
                { status: 403 }
            );
        }

        // Check rate limit
        const clientIp = getClientIp(request);
        const rateLimitKey = `support-ticket:${session.user.id}:${clientIp}`;

        if (!(await checkAndUpdateRateLimit(rateLimitKey))) {
            const lastSubmission = rateLimitStore.get(rateLimitKey);
            const waitTime = lastSubmission
                ? Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - lastSubmission)) / 60000)
                : Math.ceil(RATE_LIMIT_WINDOW / 60000);
            return new NextResponse(
                `Rate limit exceeded. Please wait ${waitTime} minutes before submitting another ticket.`,
                { status: 429 }
            );
        }

        // Log received data size for monitoring
        if (safeConsoleLogs) {
            serverLog.info('Ticket received with diagnostics for authenticated support request');
        }

        // Create ticket with additional data
        const ticket = await prisma.ticket.create({
            data: {
                userId: session.user.id,
                email: sessionEmail,
                description: safeDescription,
                status: 'WAITING',
                consoleLogs: safeConsoleLogs || null,
                browserInfo: safeBrowserInfo || null,
                pageUrl: safePageUrl,
            },
        });

        // Send admin notification (fire-and-forget)
        import('@/lib/email').then(({ sendTicketNotification }) => {
            sendTicketNotification(ticket.id, sessionEmail, safeDescription).catch(err =>
                serverLog.error('Failed to send admin notification', err)
            );
        });

        return NextResponse.json({
            success: true,
            message: 'Ticket submitted successfully. We will review it shortly.',
            ticketId: ticket.id,
        });
    } catch (error) {
        if (error instanceof Error && /required|too large|must be/.test(error.message)) {
            return new NextResponse(error.message, { status: 400 });
        }

        serverLog.error('Ticket submission error', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// GET endpoint to check rate limit status
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const rateLimitKey = `support-ticket:${session.user.id}:${getClientIp(request)}`;
        const canSubmit = checkLocalRateLimit(rateLimitKey);
        let waitTime = 0;

        if (!canSubmit) {
            const lastSubmission = rateLimitStore.get(rateLimitKey);
            waitTime = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - lastSubmission!)) / 60000);
        }

        return NextResponse.json({
            canSubmit,
            waitTime,
        });
    } catch (error) {
        serverLog.error('Rate limit check error', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
