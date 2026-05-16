import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCache, setCache } from "@/lib/redis";
import { isSessionRevoked } from "@/lib/session-revocation";

export async function GET(req: NextRequest) {
  const sessionToken =
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value;

  if (sessionToken) {
    const revoked = await isSessionRevoked(sessionToken);
    if (revoked) {
      return NextResponse.json(
        { valid: false, reason: "Session revoked" },
        { status: 401 },
      );
    }

    try {
      const cachedValidity = await getCache<boolean>(
        `session_valid:${sessionToken}`,
      );
      if (cachedValidity === true) {
        return NextResponse.json({ valid: true });
      }
    } catch {
      // Redis error - fall through to database check
    }
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { valid: false, reason: "No session" },
      { status: 401 },
    );
  }

  if (sessionToken) {
    setCache(`session_valid:${sessionToken}`, true, 600).catch(() => {
      // Ignore cache errors
    });
  }

  return NextResponse.json({ valid: true });
}
