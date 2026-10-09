-- AlterTable
ALTER TABLE "TakConfiguration" ADD COLUMN "atakPreferenceEntries" JSONB;
ALTER TABLE "TakConfiguration" ADD COLUMN "atakPreferenceFileName" TEXT;
ALTER TABLE "TakConfiguration" ADD COLUMN "atakSettings" JSONB;
