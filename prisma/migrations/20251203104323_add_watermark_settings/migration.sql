-- CreateTable
CREATE TABLE "WatermarkSettings" (
    "id" TEXT NOT NULL,
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "sizeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "WatermarkSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatermarkSettings_updatedAt_idx" ON "WatermarkSettings"("updatedAt");
