import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { getVdoCipherOtp, VdoCipherApiError } from '@/lib/vdocipher';

const OTP_TTL_SECONDS = 300;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown VdoCipher OTP error';
}

function getVdoCipherErrorStatus(error: unknown) {
  return error instanceof VdoCipherApiError ? error.status : undefined;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const { videoId } = await req.json();

  if (!videoId) {
    return new NextResponse('Invalid request', { status: 400 });
  }

  const entitlement = await evaluateMediaEntitlement({
    session,
    videoId,
    checkViewLimit: true,
  });

  if (!entitlement.allowed) {
    const denial = mapMediaEntitlementToHttp(entitlement);
    return new NextResponse(denial.body, { status: denial.status });
  }

  const { video } = entitlement;

  if (
    video.provider !== 'VDOCIPHER' ||
    video.vdocipherStatus !== 'READY' ||
    !video.vdocipherVideoId ||
    !video.vdocipherAccountId
  ) {
    return new NextResponse('Video is not ready for VdoCipher playback', { status: 404 });
  }

  let otp;

  try {
    const account = resolveVdoCipherAccount(video.vdocipherAccountId);
    otp = await getVdoCipherOtp({
      apiSecret: account.apiSecret,
      vdoCipherVideoId: video.vdocipherVideoId,
      ttl: OTP_TTL_SECONDS,
    });
  } catch (error) {
    console.error('VdoCipher OTP generation failed', {
      videoId,
      vdoCipherVideoId: video.vdocipherVideoId,
      vdocipherAccountId: video.vdocipherAccountId,
      providerStatus: getVdoCipherErrorStatus(error),
      message: getErrorMessage(error),
    });

    return new NextResponse('Playback provider unavailable', { status: 502 });
  }

  return NextResponse.json({
    otp: otp.otp,
    playbackInfo: otp.playbackInfo,
    expiresIn: OTP_TTL_SECONDS,
  });
}
