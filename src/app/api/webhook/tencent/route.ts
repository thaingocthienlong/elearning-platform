import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadTencentEnv } from '@/lib/tencent/env';
import { verifyTencentWebhookSignature } from '@/lib/tencent/webhook';
import { extractTencentPlaybackUrlsFromAdaptiveOutputs, normalizeTencentStatus } from '@/lib/tencent/vod';
import { serverLog } from '@/lib/server-log';

type TencentWebhookPayload = {
  FileId?: string;
  TaskId?: string;
  Status?: string;
  EventType?: string;
  FileUploadEvent?: {
    FileId?: string;
    SourceContext?: string;
  };
  ProcedureStateChangeEvent?: {
    FileId?: string;
    TaskId?: string;
    Status?: string;
    SessionContext?: string;
    MediaProcessResultSet?: Array<{
      Type?: string;
      TranscodeTask?: {
        Output?: {
          Url?: string;
        };
      };
      AdaptiveDynamicStreamingTask?: {
        Output?: {
          Definition?: number;
          Format?: string;
          Package?: string;
          DrmType?: string;
          Url?: string;
        };
      };
    }>;
  };
};

function compactWhere(fileId?: string, taskId?: string, sourceContext?: string) {
  const clauses: Array<{ tencentFileId: string } | { tencentTaskId: string } | { id: string }> = [];
  if (fileId) clauses.push({ tencentFileId: fileId });
  if (taskId) clauses.push({ tencentTaskId: taskId });
  if (sourceContext && /^[0-9a-f]{24}$/i.test(sourceContext)) clauses.push({ id: sourceContext });
  return clauses;
}

function extractPlaybackUrls(payload: TencentWebhookPayload) {
  const adaptiveOutputs = payload.ProcedureStateChangeEvent?.MediaProcessResultSet
    ?.map((item) => item.AdaptiveDynamicStreamingTask?.Output)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const transcodeUrl = payload.ProcedureStateChangeEvent?.MediaProcessResultSet
    ?.map((item) => item.TranscodeTask?.Output?.Url)
    .find(Boolean);

  return extractTencentPlaybackUrlsFromAdaptiveOutputs(adaptiveOutputs, transcodeUrl);
}

export async function POST(req: Request) {
  const env = loadTencentEnv();
  const url = new URL(req.url);
  const sign = req.headers.get('sign') ?? req.headers.get('x-tencent-sign') ?? url.searchParams.get('Sign');
  const timestamp = req.headers.get('t') ?? req.headers.get('x-tencent-t') ?? url.searchParams.get('T');

  if (!verifyTencentWebhookSignature({ sign, timestamp, secret: env.webhookSignKey })) {
    serverLog.warn('Invalid Tencent webhook signature');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const payload = (await req.json()) as TencentWebhookPayload;
  const fileId = payload.FileId ?? payload.FileUploadEvent?.FileId ?? payload.ProcedureStateChangeEvent?.FileId;
  const taskId = payload.TaskId ?? payload.ProcedureStateChangeEvent?.TaskId;
  const sourceContext = payload.FileUploadEvent?.SourceContext ?? payload.ProcedureStateChangeEvent?.SessionContext;
  const rawStatus = payload.Status ?? payload.ProcedureStateChangeEvent?.Status;
  const status = normalizeTencentStatus(rawStatus);
  const whereClauses = compactWhere(fileId, taskId, sourceContext);

  if (whereClauses.length === 0) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const urls = extractPlaybackUrls(payload);
  await prisma.video.updateMany({
    where: { OR: whereClauses },
    data: {
      tencentFileId: fileId,
      tencentTaskId: taskId,
      tencentStatus: urls.playbackUrl ? 'READY' : status,
      dashUrl: urls.dashUrl,
      hlsUrl: urls.hlsUrl,
      hlsUrlClear: urls.hlsUrlClear,
      tencentAdaptiveTemplateId: urls.tencentAdaptiveTemplateId?.toString(),
      tencentAppleFallbackDrmType: urls.tencentAppleFallbackDrmType,
      tencentSyncedAt: new Date(),
      published: Boolean(urls.playbackUrl) || status === 'READY',
    },
  });

  return NextResponse.json({ ok: true });
}
