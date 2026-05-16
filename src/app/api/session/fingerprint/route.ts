import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeSession } from "@/lib/session-revocation";

const DEVICE_REPLACED_REASON = "Signed in on another device";
const ACTIVITY_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

function getSessionToken(req: NextRequest) {
  return (
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fingerprint } = await req.json();

    if (!fingerprint) {
      return NextResponse.json(
        { error: "Fingerprint required" },
        { status: 400 },
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || null;

    const sessionToken = getSessionToken(req);

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token not found" },
        { status: 401 },
      );
    }

    const currentSession = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!currentSession) {
      return NextResponse.json(
        { error: "Session not found in DB" },
        { status: 404 },
      );
    }

    if (currentSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    await prisma.session.update({
      where: { id: currentSession.id },
      data: {
        fingerprint,
        ipAddress,
        userAgent,
        lastActive: new Date(),
      },
    });

    const otherSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        id: { not: currentSession.id },
      },
    });

    const sessionsToRevoke = otherSessions.filter(
      (staleSession) =>
        staleSession.sessionToken &&
        staleSession.fingerprint &&
        staleSession.fingerprint !== fingerprint,
    );

    if (sessionsToRevoke.length > 0) {
      for (const staleSession of sessionsToRevoke) {
        await revokeSession(staleSession.sessionToken!, DEVICE_REPLACED_REASON);
      }

      await prisma.session.deleteMany({
        where: {
          id: { in: sessionsToRevoke.map((staleSession) => staleSession.id) },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fingerprint update error:", error);
    return NextResponse.json(
      { error: "Failed to update fingerprint" },
      { status: 500 },
    );
  }
}

// Update session activity
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionToken = getSessionToken(req);

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token not found" },
        { status: 401 },
      );
    }

    const currentSession = await prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!currentSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (currentSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    const lastActive = currentSession.lastActive;
    const shouldUpdateActivity =
      !lastActive ||
      lastActive.getTime() < Date.now() - ACTIVITY_UPDATE_INTERVAL_MS;

    if (shouldUpdateActivity) {
      await prisma.session.update({
        where: { id: currentSession.id },
        data: { lastActive: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session activity update error:", error);
    return NextResponse.json(
      { error: "Failed to update session activity" },
      { status: 500 },
    );
  }
}
