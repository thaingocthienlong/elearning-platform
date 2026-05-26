/*
  Warnings:

  - The `status` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "browserInfo" JSONB,
ADD COLUMN     "consoleLogs" JSONB,
ADD COLUMN     "pageUrl" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'WAITING';

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
