/*
  Warnings:

  - You are about to drop the column `r2Path` on the `Video` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Video" DROP CONSTRAINT "Video_courseId_fkey";

-- DropIndex
DROP INDEX "public"."Video_r2Path_key";

-- AlterTable
ALTER TABLE "public"."Video" DROP COLUMN "r2Path",
ADD COLUMN     "dashUrl" TEXT,
ADD COLUMN     "drmKidAudio" TEXT,
ADD COLUMN     "drmKidHd" TEXT,
ADD COLUMN     "drmKidSd" TEXT,
ADD COLUMN     "fairplayAssetId" TEXT,
ADD COLUMN     "hlsUrl" TEXT,
ADD COLUMN     "usagePolicyAud" TEXT DEFAULT 'AUDIO',
ADD COLUMN     "usagePolicyHd" TEXT DEFAULT 'HD',
ADD COLUMN     "usagePolicySd" TEXT DEFAULT 'SD';

-- CreateIndex
CREATE INDEX "Video_courseId_idx" ON "public"."Video"("courseId");

-- AddForeignKey
ALTER TABLE "public"."Video" ADD CONSTRAINT "Video_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
