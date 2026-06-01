import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { prisma } from '@/lib/prisma';
import { VdoCipherApiError } from '@/lib/vdocipher';
import {
  getVdoCipherOtpWithAccountFallback,
  getVdoCipherPlaybackWhitelistHref,
} from '@/lib/vdocipher-playback';

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

  let playback;
  const playbackWhitelistHref = getVdoCipherPlaybackWhitelistHref({
    requestHost: req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host,
  });

  try {
    playback = await getVdoCipherOtpWithAccountFallback({
      preferredAccountId: video.vdocipherAccountId,
      vdoCipherVideoId: video.vdocipherVideoId,
      ttl: OTP_TTL_SECONDS,
      whitelisthref: playbackWhitelistHref,
    });

    if (playback.accountId !== video.vdocipherAccountId) {
      try {
        await prisma.video.update({
          where: { id: video.id },
          data: {
            vdocipherAccountId: playback.accountId,
            vdocipherError: null,
          },
        });
        console.warn('Repaired VdoCipher account mapping during OTP generation', {
          videoId,
          vdoCipherVideoId: video.vdocipherVideoId,
          previousAccountId: video.vdocipherAccountId,
          recoveredAccountId: playback.accountId,
          attemptedAccountIds: playback.attemptedAccountIds,
        });
      } catch (repairError) {
        console.error('Failed to persist repaired VdoCipher account mapping', {
          videoId,
          vdoCipherVideoId: video.vdocipherVideoId,
          previousAccountId: video.vdocipherAccountId,
          recoveredAccountId: playback.accountId,
          message: getErrorMessage(repairError),
        });
      }
    }
  } catch (error) {
    console.error('VdoCipher OTP generation failed', {
      videoId,
      vdoCipherVideoId: video.vdocipherVideoId,
      vdocipherAccountId: video.vdocipherAccountId,
      whitelisthref: playbackWhitelistHref,
      providerStatus: getVdoCipherErrorStatus(error),
      message: getErrorMessage(error),
    });

    return new NextResponse('Playback provider unavailable', { status: 502 });
  }

  return NextResponse.json({
    otp: playback.result.otp,
    playbackInfo: playback.result.playbackInfo,
    expiresIn: OTP_TTL_SECONDS,
  });
}
