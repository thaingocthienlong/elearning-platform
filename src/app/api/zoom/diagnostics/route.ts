import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const ZOOM_WEB_SDK_VERSION = '6.0.2';
const ATTENDEE_ROLE = 0;
const TOKEN_WINDOW_SECONDS = 60 * 60 * 2;

function fingerprint(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  const sdkKey = process.env.ZOOM_MEETING_SDK_KEY || '';
  const sdkSecret = process.env.ZOOM_MEETING_SDK_SECRET || '';
  const meetingNumber = (process.env.NEXT_PUBLIC_ZOOM_MEETING_ID || '').trim();
  const passcode = process.env.NEXT_PUBLIC_ZOOM_PASSCODE || '';
  const requestUrl = new URL(req.url);

  return NextResponse.json({
    configured: {
      sdkKey: Boolean(sdkKey),
      sdkSecret: Boolean(sdkSecret),
      meetingNumber: Boolean(meetingNumber),
      passcode: Boolean(passcode),
    },
    deployment: {
      vercelCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null,
      vercelEnv: process.env.VERCEL_ENV || null,
    },
    meetingNumber: meetingNumber || null,
    passcodeConfigured: Boolean(passcode),
    requestHost: req.headers.get('x-forwarded-host') || requestUrl.host,
    sdkKeyFingerprint: sdkKey ? fingerprint(sdkKey) : null,
    tokenClaims: sdkKey && meetingNumber
      ? {
          appKeyFingerprint: fingerprint(sdkKey),
          hasTokenExp: true,
          mn: meetingNumber,
          role: ATTENDEE_ROLE,
          tokenWindowSeconds: TOKEN_WINDOW_SECONDS,
        }
      : null,
    zoomWebSdkVersion: ZOOM_WEB_SDK_VERSION,
  });
}
