-- AddForeignKey
ALTER TABLE "public"."VideoKeystore" ADD CONSTRAINT "VideoKeystore_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "public"."Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
