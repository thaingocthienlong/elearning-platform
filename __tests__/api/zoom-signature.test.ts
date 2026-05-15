/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST as zoomSignaturePost } from '@/app/api/zoom/signature/route';
import { GET as zoomDiagnosticsGet } from '@/app/api/zoom/diagnostics/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    allowedEmail: {
      findUnique: jest.fn(),
    },
    watermarkSettings: {
      findUnique: jest.fn(),
    },
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  allowedEmail: {
    findUnique: jest.Mock;
  };
  watermarkSettings: {
    findUnique: jest.Mock;
  };
};

const originalEnv = process.env;

function request(body: unknown = {}) {
  return new Request('http://localhost.test/api/zoom/signature', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

function decodeJwtPayload(signature: string) {
  const payload = signature.split('.')[1];
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64url').toString('utf8'));
}

describe('Zoom signature route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ZOOM_MEETING_SDK_KEY: 'sdk-key',
      ZOOM_MEETING_SDK_SECRET: 'sdk-secret',
      NEXT_PUBLIC_ZOOM_MEETING_ID: '987654321',
      NEXT_PUBLIC_ZOOM_PASSCODE: 'public-passcode',
    };
    mockedPrisma.allowedEmail.findUnique.mockResolvedValue(null);
    mockedPrisma.watermarkSettings.findUnique.mockResolvedValue(null);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('rejects unauthenticated requests before generating a signature', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const response = await zoomSignaturePost(request({ meetingNumber: 'attacker', role: 1 }));

    expect(response.status).toBe(401);
    expect(mockedPrisma.allowedEmail.findUnique).not.toHaveBeenCalled();
  });

  test('fails closed when Zoom signing config is missing', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: 'learner@example.test', role: 'USER' },
    });
    delete process.env.ZOOM_MEETING_SDK_SECRET;

    const response = await zoomSignaturePost(request());

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Zoom meeting is not configured');
  });

  test('derives learner role and meeting config server-side', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: 'learner@example.test', name: 'Learner One', role: 'USER' },
    });

    const response = await zoomSignaturePost(request({ meetingNumber: '111', role: 1 }));

    expect(response.status).toBe(200);
    const body = await response.json();
    const payload = decodeJwtPayload(body.signature);

    expect(body.sdkKey).toBe('sdk-key');
    expect(body).not.toHaveProperty('secret');
    expect(body.meetingNumber).toBe('987654321');
    expect(body.passcode).toBe('public-passcode');
    expect(body.role).toBe(0);
    expect(body.watermarkText).toBe('Learner One');
    expect(payload.mn).toBe('987654321');
    expect(payload.role).toBe(0);
  });

  test('keeps admin users on attendee role until a host ZAK flow exists', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: 'admin@example.test', name: 'Admin One', role: 'ADMIN' },
    });
    mockedPrisma.allowedEmail.findUnique.mockResolvedValue({
      fullname: 'Admin Name',
      phone: '555-0100',
    });
    mockedPrisma.watermarkSettings.findUnique.mockResolvedValue({
      zoomWatermarkColor: '#FF0000',
      zoomWatermarkOpacity: 0.4,
      zoomWatermarkSizePercent: 3,
    });

    const response = await zoomSignaturePost(request({ role: 0 }));

    expect(response.status).toBe(200);
    const body = await response.json();
    const payload = decodeJwtPayload(body.signature);

    expect(body.role).toBe(0);
    expect(body.watermarkText).toBe('Admin Name - 555-0100');
    expect(body.zoomWatermarkColor).toBe('#FF0000');
    expect(body.zoomWatermarkOpacity).toBe(0.4);
    expect(body.zoomWatermarkSizePercent).toBe(3);
    expect(payload.role).toBe(0);
  });
});

describe('Zoom diagnostics route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ZOOM_MEETING_SDK_KEY: 'sdk-key',
      ZOOM_MEETING_SDK_SECRET: 'sdk-secret',
      NEXT_PUBLIC_ZOOM_MEETING_ID: '987654321',
      NEXT_PUBLIC_ZOOM_PASSCODE: 'public-passcode',
      VERCEL_GIT_COMMIT_SHA: '1234567890abcdef',
      VERCEL_ENV: 'preview',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns admin-only Zoom deployment diagnostics without secrets', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { email: 'admin@example.test', role: 'ADMIN' },
    });

    const response = await zoomDiagnosticsGet(
      new Request('https://staging.example.test/api/zoom/diagnostics', {
        headers: { 'x-forwarded-host': 'elearning.example.test' },
      }) as never
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.meetingNumber).toBe('987654321');
    expect(body.sdkKeyFingerprint).toEqual(expect.any(String));
    expect(body.sdkKeyFingerprint).not.toBe('sdk-key');
    expect(body.configured).toMatchObject({
      sdkKey: true,
      sdkSecret: true,
      meetingNumber: true,
      passcode: true,
    });
    expect(body.tokenClaims).toMatchObject({
      mn: '987654321',
      role: 0,
      tokenWindowSeconds: 7200,
      hasTokenExp: true,
    });
    expect(body.requestHost).toBe('elearning.example.test');
    expect(body.deployment).toMatchObject({
      vercelCommit: '1234567890ab',
      vercelEnv: 'preview',
    });
    expect(body.zoomWebSdkVersion).toBe('6.0.2');
    expect(JSON.stringify(body)).not.toContain('sdk-secret');
    expect(JSON.stringify(body)).not.toContain('public-passcode');
  });
});
