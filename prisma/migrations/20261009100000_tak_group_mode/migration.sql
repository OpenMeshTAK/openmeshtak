-- AlterTable
ALTER TABLE "EventRole" ADD COLUMN "seesAllTakGroups" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TakConfiguration" ADD COLUMN "groupMode" TEXT NOT NULL DEFAULT 'off';
