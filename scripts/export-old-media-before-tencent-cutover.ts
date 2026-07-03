import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';

export async function exportOldMediaRows(outputPath: string) {
  const result = await prisma.$runCommandRaw({
    find: 'Video',
    projection: {
      id: true,
      title: true,
      courseId: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      r2Key: true,
      dashUrl: true,
      hlsUrl: true,
      hlsUrlClear: true,
      drmKeyId: true,
      axinomVideoId: true,
      axinomIdClear: true,
      axinomJobId: true,
      axinomEncodingStatus: true,
      axinomOutputLocation: true,
      axinomSyncedAt: true,
      isDeleted: true,
    },
    sort: { createdAt: 1 },
  });
  const videos = Array.isArray((result as { cursor?: { firstBatch?: unknown[] } }).cursor?.firstBatch)
    ? (result as { cursor: { firstBatch: unknown[] } }).cursor.firstBatch
    : [];

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ exportedAt: new Date().toISOString(), videos }, null, 2));
  return { outputPath, count: videos.length };
}

async function main() {
  const outputPath = process.argv[2] ?? path.join(process.cwd(), 'reports', 'tencent-cutover-old-media-export.json');
  const result = await exportOldMediaRows(outputPath);
  console.log(`Exported ${result.count} old media rows to ${result.outputPath}`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Old media export failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
