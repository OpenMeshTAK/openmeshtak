-- AlterTable
ALTER TABLE "Event" ADD COLUMN "meshtasticEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Existing events were Meshtastic events, except those that only used the built-in TAK server:
-- the Meshtastic switch replaces the separate TAK connection mode.
UPDATE "Event" SET "meshtasticEnabled" = true
WHERE "id" NOT IN (SELECT "eventId" FROM "TakConfiguration" WHERE "mode" = 'built-in-server');

-- AlterTable
ALTER TABLE "TakConfiguration" DROP COLUMN "mode";
