-- Audit entries name the event they belong to, so event-scoped `audit.read` can list them.
-- Existing entries take it from an event target or from the `eventId` the services already
-- wrote into their metadata.
ALTER TABLE "AuditEvent" ADD COLUMN "eventId" TEXT;

UPDATE "AuditEvent"
SET "eventId" = CASE
  WHEN "targetType" = 'event' THEN "targetId"
  WHEN json_valid("metadata") AND json_type("metadata", '$.eventId') = 'text' THEN json_extract("metadata", '$.eventId')
  ELSE NULL
END;

CREATE INDEX "AuditEvent_eventId_occurredAt_id_idx" ON "AuditEvent"("eventId", "occurredAt", "id");
