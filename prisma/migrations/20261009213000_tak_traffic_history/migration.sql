-- AlterTable
ALTER TABLE "TakTrafficItem" ADD COLUMN "how" TEXT;
ALTER TABLE "TakTrafficItem" ADD COLUMN "ce" REAL;
ALTER TABLE "TakTrafficItem" ADD COLUMN "selfReported" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "TakTrafficItem_eventId_time_idx" ON "TakTrafficItem"("eventId", "time");
