import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    defaultVideoWatermarkSettings,
    normalizeVideoWatermarkSettings,
    videoWatermarkSettingsSelect,
    WATERMARK_SCOPE,
} from '@/lib/watermark-settings';

// Public endpoint to fetch watermark settings.
export async function GET() {
    try {
        const data = await prisma.watermarkSettings.findUnique({
            where: { scope: WATERMARK_SCOPE },
            select: videoWatermarkSettingsSelect,
        });
        const settings = data
            ? normalizeVideoWatermarkSettings(data)
            : defaultVideoWatermarkSettings;

        return NextResponse.json(settings, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Error fetching watermark settings:', error);
        // Return default settings on error
        return NextResponse.json(defaultVideoWatermarkSettings);
    }
}
