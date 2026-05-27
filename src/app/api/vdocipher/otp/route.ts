import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  evaluateMediaEntitlement,
  mapMediaEntitlementToHttp,
} from '@/lib/media-entitlement';
import { resolveVdoCipherAccount } from '@/lib/vdocipher-accounts';
import { getVdoCipherOtp } from '@/lib/vdocipher';
import { buildVdoCipherAnnotate } from '@/lib/vdocipher-watermark';

const OTP_TTL_SECONDS = 300;

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

  const { video, user } = entitlement;

  if (
    video.provider !== 'VDOCIPHER' ||
    video.vdocipherStatus !== 'READY' ||
    !video.vdocipherVideoId ||
    !video.vdocipherAccountId
  ) {
    return new NextResponse('Video is not ready for VdoCipher playback', { status: 404 });
  }

  const account = resolveVdoCipherAccount(video.vdocipherAccountId);
  const watermarkText = user.name || user.email || user.id;
  const otp = await getVdoCipherOtp({
    apiSecret: account.apiSecret,
    vdoCipherVideoId: video.vdocipherVideoId,
    ttl: OTP_TTL_SECONDS,
    annotate: buildVdoCipherAnnotate(watermarkText),
  });

  return NextResponse.json({
    otp: otp.otp,
    playbackInfo: otp.playbackInfo,
    expiresIn: OTP_TTL_SECONDS,
  });
}
