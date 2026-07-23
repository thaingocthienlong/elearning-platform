/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { DELETE } from '@/app/api/admin/security-events/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/server-log', () => ({
  serverLog: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    securityEvent: {
      deleteMany: jest.fn(),
      create: jest.fn(),
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

function deleteRequest(body?: unknown) {
  return new Request('http://localhost.test/api/admin/security-events', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never;
}

describe('DELETE /api/admin/security-events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });
  });

  test('rejects a request without exact confirmation', async () => {
    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(400);
    expect(mockedPrisma.securityEvent.deleteMany).not.toHaveBeenCalled();
    expect(mockedPrisma.securityEvent.create).not.toHaveBeenCalled();
  });

  test('flushes events and writes a surviving audit event after exact confirmation', async () => {
    mockedPrisma.securityEvent.deleteMany.mockResolvedValue({ count: 3 });
    mockedPrisma.securityEvent.create.mockResolvedValue({ id: 'audit-event-1' });

    const response = await DELETE(
      deleteRequest({ confirm: 'FLUSH_SECURITY_EVENTS' })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'All security events flushed successfully',
      count: 3,
    });
    expect(mockedPrisma.securityEvent.deleteMany).toHaveBeenCalledWith({});
    expect(mockedPrisma.securityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'admin-1',
        eventType: 'SECURITY_EVENTS_FLUSHED',
        metadata: {
          deletedCount: 3,
          confirmed: true,
        },
      }),
    });
  });
});
