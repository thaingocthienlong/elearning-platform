/**
 * @jest-environment node
 */
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { GET as securityEventsGet } from '@/app/api/admin/security-events/route';
import {
  GET as watermarkGet,
  POST as watermarkPost,
} from '@/app/api/admin/watermark-settings/route';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/redis', () => ({
  invalidateCache: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    securityEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    watermarkSettings: {
      upsert: jest.fn(),
    },
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  securityEvent: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  watermarkSettings: {
    upsert: jest.Mock;
  };
};

function request(url: string, body?: unknown) {
  return new Request(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }) as never;
}

describe('admin data bounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' },
    });
  });

  test('security events clamp page size and apply a date lower bound', async () => {
    mockedPrisma.securityEvent.findMany.mockResolvedValue([]);
    mockedPrisma.securityEvent.count.mockResolvedValue(0);

    const response = await securityEventsGet(
      request('http://localhost.test/api/admin/security-events?page=1&limit=500')
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.limit).toBe(100);
    expect(body.since).toEqual(expect.any(String));
    expect(mockedPrisma.securityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        where: expect.objectContaining({
          createdAt: {
            gte: expect.any(Date),
          },
        }),
      })
    );
  });

  test('watermark GET creates or reads the singleton global settings document', async () => {
    mockedPrisma.watermarkSettings.upsert.mockResolvedValue({
      id: 'settings-1',
      scope: 'global',
      opacity: 0.5,
    });

    const response = await watermarkGet();

    expect(response.status).toBe(200);
    expect(mockedPrisma.watermarkSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scope: 'global' },
        update: {},
        create: expect.objectContaining({ scope: 'global' }),
      })
    );
  });

  test('watermark POST updates the singleton instead of appending settings rows', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    mockedPrisma.watermarkSettings.upsert.mockResolvedValue({
      id: 'settings-1',
      scope: 'global',
      opacity: 0.7,
      sizeMultiplier: 1,
    });

    const response = await watermarkPost(
      request('http://localhost.test/api/admin/watermark-settings', { opacity: 0.7 })
    );

    expect(response.status).toBe(200);
    expect(mockedPrisma.watermarkSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scope: 'global' },
        update: expect.objectContaining({
          opacity: 0.7,
          updatedBy: 'admin@example.test',
        }),
      })
    );
  });
});
