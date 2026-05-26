import { prisma } from '@/lib/prisma';

export type MediaEntitlementDenialCode =
  | 'UNAUTHENTICATED'
  | 'USER_NOT_FOUND'
  | 'VIDEO_NOT_FOUND'
  | 'VIDEO_UNPUBLISHED'
  | 'VIDEO_DELETED'
  | 'NOT_ENROLLED'
  | 'NO_VIDEO_ACCESS'
  | 'ACCESS_EXPIRED'
  | 'ACCESS_NOT_YET_VALID'
  | 'ACCESS_PERIOD_ENDED'
  | 'VIEW_LIMIT_EXCEEDED';

export type MediaEntitlementOptions = {
  session:
    | {
        user?: {
          id?: string | null;
          email?: string | null;
        } | null;
      }
    | null
    | undefined;
  videoId: string;
  requirePublished?: boolean;
  checkViewLimit?: boolean;
  now?: Date;
};

export type MediaEntitlementAllowed = {
  allowed: true;
  user: {
    id: string;
    email: string | null;
    name?: string | null;
  };
  video: {
    id: string;
    courseId: string;
    drmKeyId?: string | null;
    providerContentId?: string | null;
    hlsUrl?: string | null;
    dashUrl?: string | null;
    hlsUrlClear?: string | null;
    viewLimit?: number | null;
    Course?: {
      id?: string;
      title?: string | null;
      accessType?: string | null;
    } | null;
  };
  watchRecord: {
    viewCount: number;
    viewLimit?: number | null;
    lastPosition?: number | null;
  } | null;
  effectiveViewLimit: number | null;
};

export type MediaEntitlementDenied = {
  allowed: false;
  code: MediaEntitlementDenialCode;
};

export type MediaEntitlementResult =
  | MediaEntitlementAllowed
  | MediaEntitlementDenied;

export type MediaEntitlementHttp = {
  status: number;
  body: string;
};

const denialHttpMap: Record<MediaEntitlementDenialCode, MediaEntitlementHttp> = {
  UNAUTHENTICATED: { status: 401, body: 'Unauthorized' },
  USER_NOT_FOUND: { status: 404, body: 'Not found' },
  VIDEO_NOT_FOUND: { status: 404, body: 'Not found' },
  VIDEO_UNPUBLISHED: { status: 404, body: 'Not found' },
  VIDEO_DELETED: { status: 404, body: 'Not found' },
  NOT_ENROLLED: { status: 403, body: 'Access denied' },
  NO_VIDEO_ACCESS: { status: 403, body: 'Access denied' },
  ACCESS_EXPIRED: { status: 403, body: 'Access denied' },
  ACCESS_NOT_YET_VALID: { status: 403, body: 'Access denied' },
  ACCESS_PERIOD_ENDED: { status: 403, body: 'Access denied' },
  VIEW_LIMIT_EXCEEDED: { status: 403, body: 'Access denied' },
};

export function mapMediaEntitlementToHttp(
  result: MediaEntitlementResult
): MediaEntitlementHttp {
  if (result.allowed) {
    return { status: 200, body: 'OK' };
  }

  return denialHttpMap[result.code];
}

function deny(code: MediaEntitlementDenialCode): MediaEntitlementDenied {
  return { allowed: false, code };
}

export async function evaluateMediaEntitlement({
  session,
  videoId,
  requirePublished = true,
  checkViewLimit = true,
  now = new Date(),
}: MediaEntitlementOptions): Promise<MediaEntitlementResult> {
  const sessionUser = session?.user;

  if (!sessionUser?.id && !sessionUser?.email) {
    return deny('UNAUTHENTICATED');
  }

  const [user, video] = await Promise.all([
    sessionUser.id
      ? prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { id: true, email: true, name: true, isDeleted: true },
        })
      : prisma.user.findUnique({
          where: { email: sessionUser.email ?? '' },
          select: { id: true, email: true, name: true, isDeleted: true },
        }),
    prisma.video.findUnique({
      where: { id: videoId },
      include: { Course: true },
    }),
  ]);

  if (!user || user.isDeleted) {
    return deny('USER_NOT_FOUND');
  }

  if (!video) {
    return deny('VIDEO_NOT_FOUND');
  }

  if (video.isDeleted) {
    return deny('VIDEO_DELETED');
  }

  if (requirePublished && !video.published) {
    return deny('VIDEO_UNPUBLISHED');
  }

  const isCourseOpen = video.Course?.accessType === 'OPEN';

  const [enrollment, videoAccess, watchRecord] = await Promise.all([
    isCourseOpen
      ? Promise.resolve(null)
      : prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: video.courseId,
            },
            isDeleted: false,
          },
        }),
    isCourseOpen
      ? Promise.resolve(null)
      : prisma.videoAccess.findUnique({
          where: {
            userId_videoId: {
              userId: user.id,
              videoId: video.id,
            },
          },
        }),
    checkViewLimit
      ? prisma.watchRecord.findUnique({
          where: {
            userId_videoId: {
              userId: user.id,
              videoId: video.id,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  if (!isCourseOpen) {
    if (!enrollment) {
      return deny('NOT_ENROLLED');
    }

    if (!videoAccess) {
      return deny('NO_VIDEO_ACCESS');
    }

    if (videoAccess.expiresAt && now > videoAccess.expiresAt) {
      return deny('ACCESS_EXPIRED');
    }

    if (videoAccess.validFrom && now < videoAccess.validFrom) {
      return deny('ACCESS_NOT_YET_VALID');
    }

    if (videoAccess.validUntil && now > videoAccess.validUntil) {
      return deny('ACCESS_PERIOD_ENDED');
    }
  }

  const effectiveViewLimit =
    watchRecord?.viewLimit !== null && watchRecord?.viewLimit !== undefined
      ? watchRecord.viewLimit
      : video.viewLimit ?? null;

  if (
    checkViewLimit &&
    effectiveViewLimit !== null &&
    watchRecord &&
    watchRecord.viewCount >= effectiveViewLimit
  ) {
    return deny('VIEW_LIMIT_EXCEEDED');
  }

  return {
    allowed: true,
    user,
    video,
    watchRecord,
    effectiveViewLimit,
  };
}
