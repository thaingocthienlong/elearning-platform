import type { BunnyStreamStatus } from '@prisma/client';

export const BUNNY_STREAM_STATUS_LABELS: Record<BunnyStreamStatus, string> = {
  CREATED: 'Created',
  UPLOADING: 'Uploading',
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  ENCODING: 'Encoding',
  PLAYABLE: 'First playable rendition ready',
  READY: 'Finished',
  FAILED: 'Failed',
};

export function mapBunnyStreamStatus(
  status: number,
  previousStatus?: BunnyStreamStatus | null
): BunnyStreamStatus {
  switch (status) {
    case 0:
      return 'QUEUED';
    case 1:
      return 'PROCESSING';
    case 2:
      return 'ENCODING';
    case 3:
      return 'READY';
    case 4:
      return 'PLAYABLE';
    case 5:
      return 'FAILED';
    case 6:
      return 'UPLOADING';
    case 7:
      return 'QUEUED';
    case 8:
      return 'FAILED';
    case 9:
    case 10:
      return previousStatus ?? 'PROCESSING';
    default:
      return 'FAILED';
  }
}
