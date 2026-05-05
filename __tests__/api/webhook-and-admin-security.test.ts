/**
 * @jest-environment node
 */
import crypto from 'node:crypto';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { POST as axinomWebhookPost } from '@/app/api/webhook/axinom/route';
import { DELETE as securityEventsDelete } from '@/app/api/admin/security-events/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    securityEvent: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  securityEvent: {
    deleteMany: jest.Mock;
    create: jest.Mock;
  };
};

function webhookRequest(body: string, signature?: string) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (signature) {
    headers.set('x-mosaic-signature', signature);
  }

  return new Request('http://localhost.test/api/webhook/axinom', {
    method: 'POST',
    headers,
    body,
  }) as never;
}

function deleteRequest(body: unknown) {
  return new Request('http://localhost.test/api/admin/security-events', {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.40',
      'user-agent': 'jest',
    },
    body: JSON.stringify(body),
  }) as never;
}

describe('webhook signature safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AXINOM_WEBHOOK_SECRET = 'webhook-secret';
  });

  test('missing Axinom signature returns 401', async () => {
    const response = await axinomWebhookPost(webhookRequest('{"eventType":"VideoEncodingFinished"}'));

    expect(response.status).toBe(401);
  });

  test('malformed Axinom signature returns 403 instead of throwing 500', async () => {
    const response = await axinomWebhookPost(
      webhookRequest('{"eventType":"VideoEncodingFinished"}', 'not-a-hex-signature')
    );

    expect(response.status).toBe(403);
  });

  test('wrong-length Axinom signature returns 403 instead of throwing 500', async () => {
    const response = await axinomWebhookPost(
      webhookRequest('{"eventType":"VideoEncodingFinished"}', 'abcd')
    );

    expect(response.status).toBe(403);
  });

  test('well-shaped invalid Axinom signature returns 403', async () => {
    const badSignature = '0'.repeat(64);

    const response = await axinomWebhookPost(
      webhookRequest('{"eventType":"VideoEncodingFinished"}', badSignature)
    );

    expect(response.status).toBe(403);
  });

  test('valid ignored event still succeeds', async () => {
    const body = '{"eventType":"SomethingElse"}';
    const signature = crypto
      .createHmac('sha256', 'webhook-secret')
      .update(body)
      .digest('hex');

    const response = await axinomWebhookPost(webhookRequest(body, signature));

    expect(response.status).toBe(200);
  });
});

describe('security event destructive action protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'ADMIN',
      },
    });
    mockedPrisma.securityEvent.deleteMany.mockResolvedValue({ count: 7 });
    mockedPrisma.securityEvent.create.mockResolvedValue({ id: 'audit-1' });
  });

  test('security-event flush requires admin session', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const response = await securityEventsDelete(
      deleteRequest({ confirm: 'FLUSH_SECURITY_EVENTS' })
    );

    expect(response.status).toBe(401);
    expect(mockedPrisma.securityEvent.deleteMany).not.toHaveBeenCalled();
  });

  test('security-event flush requires explicit confirmation', async () => {
    const response = await securityEventsDelete(deleteRequest({ confirm: 'DELETE' }));

    expect(response.status).toBe(400);
    expect(mockedPrisma.securityEvent.deleteMany).not.toHaveBeenCalled();
  });

  test('security-event flush writes audit event after deletion', async () => {
    const response = await securityEventsDelete(
      deleteRequest({ confirm: 'FLUSH_SECURITY_EVENTS' })
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.securityEvent.deleteMany).toHaveBeenCalledWith({});
    expect(mockedPrisma.securityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'admin-1',
        eventType: 'SECURITY_EVENTS_FLUSHED',
        metadata: {
          deletedCount: 7,
          confirmed: true,
        },
        ipAddress: '203.0.113.40',
        userAgent: 'jest',
      }),
    });
  });
});
