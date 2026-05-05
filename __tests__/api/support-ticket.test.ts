/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis';
import { POST } from '@/app/api/support/ticket/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    allowedEmail: { findUnique: jest.fn() },
    ticket: { create: jest.fn() },
  },
}));

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendTicketNotification: jest.fn().mockResolvedValue(undefined),
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedGetRedisClient = getRedisClient as jest.Mock;
const mockedPrisma = prisma as unknown as {
  allowedEmail: { findUnique: jest.Mock };
  ticket: { create: jest.Mock };
};

const session = {
  user: {
    id: 'user-1',
    email: 'learner@example.test',
  },
};

let requestCounter = 0;

function ticketRequest(body: Record<string, unknown>) {
  requestCounter += 1;

  return new Request('http://localhost.test/api/support/ticket', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${requestCounter}`,
      'user-agent': 'Mozilla/5.0 Chrome',
    },
    body: JSON.stringify({
      description: 'Help me',
      recaptchaToken: 'token',
      ...body,
    }),
  });
}

describe('support ticket protections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue(session);
    mockedGetRedisClient.mockReturnValue(null);
    mockedPrisma.allowedEmail.findUnique.mockResolvedValue({
      email: 'learner@example.test',
    });
    mockedPrisma.ticket.create.mockResolvedValue({ id: 'ticket-1' });
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as never;
  });

  test('requires an authenticated session', async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const response = await POST(ticketRequest({}));

    expect(response.status).toBe(401);
    expect(mockedPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test('rejects client email mismatch instead of storing spoofed identity', async () => {
    const response = await POST(ticketRequest({ email: 'other@example.test' }));

    expect(response.status).toBe(400);
    expect(mockedPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test('stores session email and user id for valid tickets', async () => {
    const response = await POST(ticketRequest({ email: 'learner@example.test' }));

    expect(response.status).toBe(200);
    expect(mockedPrisma.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          email: 'learner@example.test',
          description: 'Help me',
        }),
      })
    );
  });

  test('redacts nested sensitive diagnostic values before persistence', async () => {
    await POST(
      ticketRequest({
        consoleLogs: [
          {
            message: 'Authorization: Bearer abc123 from learner@example.test',
            token: 'raw-token',
            nested: {
              password: 'secret',
              safe: 'visible',
            },
          },
        ],
        browserInfo: {
          cookie: 'session=raw',
          location: 'learner@example.test',
        },
      })
    );

    const createArg = mockedPrisma.ticket.create.mock.calls[0][0];
    expect(createArg.data.consoleLogs[0]).toEqual({
      message: 'Authorization: Bearer [REDACTED] from [REDACTED_EMAIL]',
      token: '[REDACTED]',
      nested: {
        password: '[REDACTED]',
        safe: 'visible',
      },
    });
    expect(createArg.data.browserInfo).toEqual({
      cookie: '[REDACTED]',
      location: '[REDACTED_EMAIL]',
    });
  });

  test('rejects oversized descriptions before persistence', async () => {
    const response = await POST(ticketRequest({ description: 'x'.repeat(5_001) }));

    expect(response.status).toBe(400);
    expect(mockedPrisma.ticket.create).not.toHaveBeenCalled();
  });

  test('uses Redis rate limit when configured', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue('1'),
      set: jest.fn(),
    };
    mockedGetRedisClient.mockReturnValue(redis);

    const response = await POST(ticketRequest({}));

    expect(response.status).toBe(429);
    expect(redis.get).toHaveBeenCalledWith(
      expect.stringMatching(/^support-ticket:user-1:203\.0\.113\.\d+$/)
    );
    expect(mockedPrisma.ticket.create).not.toHaveBeenCalled();
  });
});
