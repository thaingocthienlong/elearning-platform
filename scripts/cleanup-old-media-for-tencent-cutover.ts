import { prisma } from '../src/lib/prisma';

export async function markOldMediaDeleted() {
  const result = await prisma.video.updateMany({
    where: {
      OR: [
        { tencentFileId: null },
        { tencentFileId: { isSet: false } },
      ],
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      published: false,
    },
  });

  return result.count;
}

async function main() {
  if (!process.argv.includes('--confirm-delete-old-media')) {
    throw new Error('Refusing to clean old media without --confirm-delete-old-media');
  }

  const count = await markOldMediaDeleted();
  console.log(`Marked ${count} old media rows deleted for Tencent cutover.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Old media cleanup failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
