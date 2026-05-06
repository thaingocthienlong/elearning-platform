import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/redis';

const WATERMARK_SCOPE = 'global';

const defaultWatermarkSettings = {
    scope: WATERMARK_SCOPE,
    opacity: 0.5,
    sizeMultiplier: 1.0,
    mobileSizeMultiplier: 0.7,
    fullscreenSizeMultiplier: 1.3,
    iosFullscreenSizeMultiplier: 0.8,
    zoomWatermarkColor: '#FFFFFF',
    zoomWatermarkOpacity: 0.2,
    zoomWatermarkSizePercent: 2.5,
};

// GET - Fetch current watermark settings
export async function GET() {
    try {
        const settings = await prisma.watermarkSettings.upsert({
            where: { scope: WATERMARK_SCOPE },
            update: {},
            create: defaultWatermarkSettings,
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching watermark settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

// POST - Update watermark settings (admin only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const {
            opacity,
            sizeMultiplier,
            mobileSizeMultiplier,
            fullscreenSizeMultiplier,
            iosFullscreenSizeMultiplier,
            // Zoom watermark settings
            zoomWatermarkColor,
            zoomWatermarkOpacity,
            zoomWatermarkSizePercent,
        } = body;

        // Validation
        if (opacity !== undefined && (opacity < 0 || opacity > 1)) {
            return NextResponse.json(
                { error: 'Opacity must be between 0 and 1' },
                { status: 400 }
            );
        }

        if (sizeMultiplier !== undefined && (sizeMultiplier < 0.5 || sizeMultiplier > 2)) {
            return NextResponse.json(
                { error: 'Size multiplier must be between 0.5 and 2' },
                { status: 400 }
            );
        }

        if (mobileSizeMultiplier !== undefined && (mobileSizeMultiplier < 0.3 || mobileSizeMultiplier > 1.5)) {
            return NextResponse.json(
                { error: 'Mobile size multiplier must be between 0.3 and 1.5' },
                { status: 400 }
            );
        }

        if (fullscreenSizeMultiplier !== undefined && (fullscreenSizeMultiplier < 0.5 || fullscreenSizeMultiplier > 2.5)) {
            return NextResponse.json(
                { error: 'Fullscreen size multiplier must be between 0.5 and 2.5' },
                { status: 400 }
            );
        }

        if (iosFullscreenSizeMultiplier !== undefined && (iosFullscreenSizeMultiplier < 0.3 || iosFullscreenSizeMultiplier > 1.5)) {
            return NextResponse.json(
                { error: 'iOS Fullscreen size multiplier must be between 0.3 and 1.5' },
                { status: 400 }
            );
        }

        // Zoom watermark validation
        if (zoomWatermarkColor !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(zoomWatermarkColor)) {
            return NextResponse.json(
                { error: 'Zoom watermark color must be a valid hex color (e.g., #FFFFFF)' },
                { status: 400 }
            );
        }

        if (zoomWatermarkOpacity !== undefined && (zoomWatermarkOpacity < 0 || zoomWatermarkOpacity > 1)) {
            return NextResponse.json(
                { error: 'Zoom watermark opacity must be between 0 and 1' },
                { status: 400 }
            );
        }

        if (zoomWatermarkSizePercent !== undefined && (zoomWatermarkSizePercent < 1 || zoomWatermarkSizePercent > 20)) {
            return NextResponse.json(
                { error: 'Zoom watermark size must be between 1% and 20%' },
                { status: 400 }
            );
        }

        const settings = await prisma.watermarkSettings.upsert({
            where: { scope: WATERMARK_SCOPE },
            create: {
                ...defaultWatermarkSettings,
                opacity: opacity ?? 0.5,
                sizeMultiplier: sizeMultiplier ?? 1.0,
                mobileSizeMultiplier: mobileSizeMultiplier ?? 0.7,
                fullscreenSizeMultiplier: fullscreenSizeMultiplier ?? 1.3,
                iosFullscreenSizeMultiplier: iosFullscreenSizeMultiplier ?? 0.8,
                zoomWatermarkColor: zoomWatermarkColor ?? '#FFFFFF',
                zoomWatermarkOpacity: zoomWatermarkOpacity ?? 0.2,
                zoomWatermarkSizePercent: zoomWatermarkSizePercent ?? 2.5,
                updatedBy: session.user.email,
            },
            update: {
                ...(opacity !== undefined ? { opacity } : {}),
                ...(sizeMultiplier !== undefined ? { sizeMultiplier } : {}),
                ...(mobileSizeMultiplier !== undefined ? { mobileSizeMultiplier } : {}),
                ...(fullscreenSizeMultiplier !== undefined ? { fullscreenSizeMultiplier } : {}),
                ...(iosFullscreenSizeMultiplier !== undefined ? { iosFullscreenSizeMultiplier } : {}),
                ...(zoomWatermarkColor !== undefined ? { zoomWatermarkColor } : {}),
                ...(zoomWatermarkOpacity !== undefined ? { zoomWatermarkOpacity } : {}),
                ...(zoomWatermarkSizePercent !== undefined ? { zoomWatermarkSizePercent } : {}),
                updatedBy: session.user.email,
            },
        });

        // Invalidate cache
        await invalidateCache('watermark:settings');

        console.log(`Watermark settings updated by ${session.user.email}:`, {
            opacity: settings.opacity,
            sizeMultiplier: settings.sizeMultiplier,
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error updating watermark settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
