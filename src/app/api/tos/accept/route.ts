import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import {
  TOS_COOKIE_NAME,
  TOS_TTL_SECONDS,
  TOS_VERSION,
  createTosAccessToken,
  readSessionToken,
} from '@/lib/tos-access';

type AcceptanceBody = {
  accepted: true;
  version: typeof TOS_VERSION;
};

function isAcceptanceBody(value: unknown): value is AcceptanceBody {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    record.accepted === true &&
    record.version === TOS_VERSION
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ code: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const sessionToken = readSessionToken(req.cookies);
  if (!sessionToken) {
    return NextResponse.json({ code: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  if (req.headers.get('origin') !== req.nextUrl.origin) {
    return NextResponse.json({ code: 'INVALID_ORIGIN' }, { status: 403 });
  }

  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ code: 'INVALID_TOS_ACCEPTANCE' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!isAcceptanceBody(body)) {
    return NextResponse.json({ code: 'INVALID_TOS_ACCEPTANCE' }, { status: 400 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ code: 'TOS_CONFIGURATION_ERROR' }, { status: 500 });
  }

  try {
    const nowMs = Date.now();
    const expiresAt = nowMs + TOS_TTL_SECONDS * 1000;
    const token = await createTosAccessToken(sessionToken, secret, nowMs);
    const response = NextResponse.json(
      { accepted: true, expiresAt },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set({
      name: TOS_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TOS_TTL_SECONDS,
      expires: new Date(expiresAt),
    });
    return response;
  } catch {
    return NextResponse.json({ code: 'TOS_ACCEPTANCE_FAILED' }, { status: 500 });
  }
}
