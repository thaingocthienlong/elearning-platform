/**
 * @jest-environment node
 */
import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/webhook/tencent/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/tencent/env', () => ({
  loadTencentEnv: jest.fn(() => ({
    webhookSignKey: 'test-webhook-sign-key',
  })),
}));

jest.mock('@/lib/tencent/webhook', () => ({
  verifyTencentWebhookSignature: jest.fn(() => true),
}));

jest.mock('@/lib/server-log', () => ({
  serverLog: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  video: {
    updateMany: jest.Mock;
  };
};

function jsonRequest(body: unknown) {
  return new Request('https://app.example/api/webhook/tencent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Tencent webhook route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.video.updateMany.mockResolvedValue({ count: 1 });
  });

  test('stores SimpleAES HLS as Apple fallback while keeping protected HLS separate', async () => {
    const response = await POST(jsonRequest({
      ProcedureStateChangeEvent: {
        FileId: 'tencent-file-id',
        TaskId: 'task-id',
        Status: 'FINISH',
        MediaProcessResultSet: [
          {
            AdaptiveDynamicStreamingTask: {
              Output: {
                Definition: 1001,
                Package: 'HLS',
                DrmType: 'Widevine',
                Url: 'https://media.example/protected/adp.wv.m3u8',
              },
            },
          },
          {
            AdaptiveDynamicStreamingTask: {
              Output: {
                Definition: 1002,
                Package: 'HLS',
                DrmType: 'SimpleAES',
                Url: 'https://media.example/fallback/adp.simpleaes.m3u8',
              },
            },
          },
        ],
      },
    }));

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { tencentFileId: 'tencent-file-id' },
          { tencentTaskId: 'task-id' },
        ],
      },
      data: expect.objectContaining({
        tencentStatus: 'READY',
        hlsUrl: 'https://media.example/protected/adp.wv.m3u8',
        hlsUrlClear: 'https://media.example/fallback/adp.simpleaes.m3u8',
        tencentAdaptiveTemplateId: '1001',
        tencentAppleFallbackDrmType: 'SimpleAES',
        published: true,
      }),
    });
  });

  test('binds a new upload by signed SourceContext before processing callbacks arrive', async () => {
    const response = await POST(jsonRequest({
      EventType: 'NewFileUpload',
      FileUploadEvent: {
        FileId: 'tencent-file-id',
        SourceContext: '64b7f0000000000000000002',
      },
    }));

    expect(response.status).toBe(200);
    expect(mockedPrisma.video.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { tencentFileId: 'tencent-file-id' },
          { id: '64b7f0000000000000000002' },
        ],
      },
      data: expect.objectContaining({
        tencentFileId: 'tencent-file-id',
      }),
    }));
  });

  test('binds an early procedure callback by signed SessionContext', async () => {
    await POST(jsonRequest({
      EventType: 'ProcedureStateChanged',
      ProcedureStateChangeEvent: {
        FileId: 'tencent-file-id',
        TaskId: 'task-id',
        Status: 'PROCESSING',
        SessionContext: '64b7f0000000000000000002',
      },
    }));

    expect(mockedPrisma.video.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { tencentFileId: 'tencent-file-id' },
          { tencentTaskId: 'task-id' },
          { id: '64b7f0000000000000000002' },
        ],
      },
    }));
  });
});
