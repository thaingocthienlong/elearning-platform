-- CreateIndex
CREATE INDEX "VideoKeystore_videoId_idx" ON "public"."VideoKeystore"("videoId");

-- CreateIndex
CREATE INDEX "WatchRecord_userId_videoId_watchedAt_idx" ON "public"."WatchRecord"("userId", "videoId", "watchedAt");

-- CreateIndex
CREATE INDEX "WatchTime_userId_videoId_idx" ON "public"."WatchTime"("userId", "videoId");
