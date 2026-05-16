/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";
import { isSessionRevoked, revokeSession } from "@/lib/session-revocation";
import {
  POST as postFingerprint,
  PATCH as patchFingerprint,
} from "@/app/api/session/fingerprint/route";
import { GET as validateSession } from "@/app/api/session/validate/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  getCache: jest.fn(),
  invalidateCacheKey: jest.fn(),
  setCache: jest.fn(),
}));

jest.mock("@/lib/session-revocation", () => ({
  isSessionRevoked: jest.fn(),
  revokeSession: jest.fn(),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  session: {
    deleteMany: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const mockedGetCache = getCache as jest.Mock;
const mockedSetCache = setCache as jest.Mock;
const mockedIsSessionRevoked = isSessionRevoked as jest.Mock;
const mockedRevokeSession = revokeSession as jest.Mock;

function nextRequest(url: string, init: RequestInit & { token?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.token) {
    headers.set("cookie", `next-auth.session-token=${init.token}`);
  }

  return new NextRequest(url, {
    ...init,
    headers,
  });
}

describe("session revocation flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: {
        email: "learner@example.test",
        id: "user-1",
      },
    });
    mockedGetCache.mockResolvedValue(null);
    mockedIsSessionRevoked.mockResolvedValue(false);
    mockedRevokeSession.mockResolvedValue({ redis: true, broadcast: 1 });
    mockedSetCache.mockResolvedValue(undefined);
  });

  test("revokes different-fingerprint sessions through revokeSession before deleting DB rows", async () => {
    const currentSession = {
      id: "current-session",
      sessionToken: "current-token",
      userId: "user-1",
      fingerprint: "old-current-fingerprint",
      lastActive: new Date("2026-05-16T00:00:00.000Z"),
    };
    const staleDeviceSession = {
      id: "old-session",
      sessionToken: "old-token",
      userId: "user-1",
      fingerprint: "iphone-fingerprint",
      lastActive: new Date("2026-05-15T00:00:00.000Z"),
    };
    const sameDeviceSession = {
      id: "same-device-session",
      sessionToken: "same-device-token",
      userId: "user-1",
      fingerprint: "chrome-fingerprint",
      lastActive: new Date("2026-05-15T00:00:00.000Z"),
    };
    const unknownFingerprintSession = {
      id: "unknown-session",
      sessionToken: "unknown-token",
      userId: "user-1",
      fingerprint: null,
      lastActive: new Date("2026-05-15T00:00:00.000Z"),
    };

    mockedPrisma.session.findUnique.mockResolvedValue(currentSession);
    mockedPrisma.session.findMany.mockResolvedValue([
      staleDeviceSession,
      sameDeviceSession,
      unknownFingerprintSession,
    ]);
    mockedPrisma.session.update.mockResolvedValue({
      ...currentSession,
      fingerprint: "chrome-fingerprint",
    });
    mockedPrisma.session.deleteMany.mockResolvedValue({ count: 1 });

    const response = await postFingerprint(
      nextRequest("http://localhost.test/api/session/fingerprint", {
        method: "POST",
        token: "current-token",
        headers: {
          "content-type": "application/json",
          "user-agent": "Chrome",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({ fingerprint: "chrome-fingerprint" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.session.update).toHaveBeenCalledWith({
      where: { id: "current-session" },
      data: {
        fingerprint: "chrome-fingerprint",
        ipAddress: "203.0.113.10",
        lastActive: expect.any(Date),
        userAgent: "Chrome",
      },
    });
    expect(mockedRevokeSession).toHaveBeenCalledTimes(1);
    expect(mockedRevokeSession).toHaveBeenCalledWith(
      "old-token",
      "Signed in on another device",
    );
    expect(mockedPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["old-session"] },
      },
    });
  });

  test("updates activity for the current cookie session only", async () => {
    const oldLastActive = new Date(Date.now() - 31 * 60 * 1000);
    mockedPrisma.session.findUnique.mockResolvedValue({
      id: "current-session",
      sessionToken: "current-token",
      userId: "user-1",
      fingerprint: "chrome-fingerprint",
      lastActive: oldLastActive,
    });
    mockedPrisma.session.update.mockResolvedValue({
      id: "current-session",
      lastActive: new Date(),
    });

    const response = await patchFingerprint(
      nextRequest("http://localhost.test/api/session/fingerprint", {
        method: "PATCH",
        token: "current-token",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.session.findUnique).toHaveBeenCalledWith({
      where: { sessionToken: "current-token" },
    });
    expect(mockedPrisma.session.update).toHaveBeenCalledWith({
      where: { id: "current-session" },
      data: { lastActive: expect.any(Date) },
    });
  });

  test("rejects revoked sessions before trusting cached validity", async () => {
    mockedIsSessionRevoked.mockResolvedValue(true);
    mockedGetCache.mockResolvedValue(true);

    const response = await validateSession(
      nextRequest("http://localhost.test/api/session/validate", {
        token: "old-token",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      valid: false,
      reason: "Session revoked",
    });
    expect(mockedGetCache).not.toHaveBeenCalled();
    expect(mockedSetCache).not.toHaveBeenCalled();
  });

  test("keeps cached valid response for non-revoked sessions", async () => {
    mockedIsSessionRevoked.mockResolvedValue(false);
    mockedGetCache.mockResolvedValue(true);

    const response = await validateSession(
      nextRequest("http://localhost.test/api/session/validate", {
        token: "current-token",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ valid: true });
    expect(mockedGetCache).toHaveBeenCalledWith("session_valid:current-token");
  });
});
