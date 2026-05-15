import { NextResponse } from 'next/server';
import { KJUR } from 'jsrsasign';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const WATERMARK_SCOPE = 'global';

export async function POST(req: Request) {
    try {
        void req;

        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const key = process.env.ZOOM_MEETING_SDK_KEY;
        const secret = process.env.ZOOM_MEETING_SDK_SECRET;
        const meetingNumber = (process.env.NEXT_PUBLIC_ZOOM_MEETING_ID || '').trim();
        const passcode = process.env.NEXT_PUBLIC_ZOOM_PASSCODE || '';

        if (!key || !secret || !meetingNumber) {
            return NextResponse.json(
                { error: 'Zoom meeting is not configured' },
                { status: 500 }
            );
        }

        // This iframe flow joins the configured meeting as a non-login participant.
        // Starting or joining as host requires a separate ZAK-backed Zoom flow.
        const role = 0;

        const iat = Math.round(new Date().getTime() / 1000) - 30;
        const exp = iat + 60 * 60 * 2;
        const oHeader = { alg: 'HS256', typ: 'JWT' };

        const oPayload = {
            sdkKey: key,
            mn: meetingNumber,
            role: role,
            iat: iat,
            exp: exp,
            appKey: key,
            tokenExp: exp,
        };

        const sHeader = JSON.stringify(oHeader);
        const sPayload = JSON.stringify(oPayload);
        const sdkJWT = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, secret);

        // Fetch User Info for Watermark (Server-Side)
        let watermarkText = 'CONFIDENTIAL';

        watermarkText = session.user.email; // Default fallback
        if (session.user.name) watermarkText = session.user.name;

        try {
            const whitelistEntry = await prisma.allowedEmail.findUnique({
                where: { email: session.user.email },
            });

            if (whitelistEntry && whitelistEntry.fullname && whitelistEntry.phone) {
                watermarkText = `${whitelistEntry.fullname} - ${whitelistEntry.phone}`;
            }
        } catch (dbError) {
            console.warn("Failed to fetch whitelist for watermark", dbError);
            // Fallback to session info is already set
        }

        // Fetch Zoom Watermark Settings from database
        let zoomWatermarkColor = '#FFFFFF';
        let zoomWatermarkOpacity = 0.2;
        let zoomWatermarkSizePercent = 2.5;

        try {
            const watermarkSettings = await prisma.watermarkSettings.findUnique({
                where: { scope: WATERMARK_SCOPE },
            });

            if (watermarkSettings) {
                zoomWatermarkColor = watermarkSettings.zoomWatermarkColor ?? '#FFFFFF';
                zoomWatermarkOpacity = watermarkSettings.zoomWatermarkOpacity ?? 0.2;
                zoomWatermarkSizePercent = watermarkSettings.zoomWatermarkSizePercent ?? 2.5;
            }
        } catch (settingsError) {
            console.warn("Failed to fetch watermark settings, using defaults", settingsError);
        }

        return NextResponse.json({
            signature: sdkJWT,
            sdkKey: key,
            meetingNumber,
            passcode,
            role,
            watermarkText,
            zoomWatermarkColor,
            zoomWatermarkOpacity,
            zoomWatermarkSizePercent,
        });
    } catch (error) {
        console.error('Error generating signature:', error);
        return NextResponse.json(
            { error: 'Failed to generate signature' },
            { status: 500 }
        );
    }
}
