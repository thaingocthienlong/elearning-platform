import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached } from '@/lib/redis';

const WATERMARK_SCOPE = 'global';

// Public endpoint to fetch watermark settings (with caching)
export async function GET() {
    try {
        const settings = await getCached(
            'watermark:settings',
            async () => {
                let data = await prisma.watermarkSettings.findUnique({
                    where: { scope: WATERMARK_SCOPE },
                    select: {
                        opacity: true,
                        sizeMultiplier: true,
                        mobileSizeMultiplier: true,
                        fullscreenSizeMultiplier: true,
                        iosFullscreenSizeMultiplier: true,
                    },
                });

                if (!data) {
                    // Return default settings if none exist
                    data = { opacity: 0.5, sizeMultiplier: 1.0, mobileSizeMultiplier: 0.7, fullscreenSizeMultiplier: 1.3, iosFullscreenSizeMultiplier: 0.8 };
                }

                return data;
            },
            600 // Cache for 10 minutes in Redis
        );

        return NextResponse.json(settings, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Error fetching watermark settings:', error);
        // Return default settings on error
        return NextResponse.json({ opacity: 0.5, sizeMultiplier: 1.0, mobileSizeMultiplier: 0.7, fullscreenSizeMultiplier: 1.3, iosFullscreenSizeMultiplier: 0.8 });
    }
}
