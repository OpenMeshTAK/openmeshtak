-- CreateTable
CREATE TABLE "AtakPreferenceList" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AtakPreferenceList_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AtakPreferenceEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "eventGroupId" TEXT,
    "eventRoleId" TEXT,
    "eventMemberId" TEXT,
    "preference" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "AtakPreferenceEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AtakPreferenceEntry_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "EventGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AtakPreferenceEntry_eventRoleId_fkey" FOREIGN KEY ("eventRoleId") REFERENCES "EventRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AtakPreferenceEntry_eventMemberId_fkey" FOREIGN KEY ("eventMemberId") REFERENCES "EventMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AtakPreferenceEntry_eventGroupId_idx" ON "AtakPreferenceEntry"("eventGroupId");

-- CreateIndex
CREATE INDEX "AtakPreferenceEntry_eventRoleId_idx" ON "AtakPreferenceEntry"("eventRoleId");

-- CreateIndex
CREATE INDEX "AtakPreferenceEntry_eventMemberId_idx" ON "AtakPreferenceEntry"("eventMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "AtakPreferenceEntry_eventId_targetKey_preference_key_key" ON "AtakPreferenceEntry"("eventId", "targetKey", "preference", "key");

-- Move the uploaded files' entries into the list as event-wide entries.
INSERT INTO "AtakPreferenceEntry" ("id", "eventId", "targetKey", "preference", "key", "type", "value")
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-'
        || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    "TakConfiguration"."eventId",
    'event',
    json_extract("entry"."value", '$.preference'),
    json_extract("entry"."value", '$.key'),
    json_extract("entry"."value", '$.type'),
    json_extract("entry"."value", '$.value')
FROM "TakConfiguration", json_each("TakConfiguration"."atakPreferenceEntries") AS "entry"
WHERE "TakConfiguration"."atakPreferenceEntries" IS NOT NULL;

-- Move the form's choices on top; the form won over the file for the same key.
WITH "choice" ("name", "chosen", "key", "value") AS (
    VALUES
        ('coordinateFormat', 'MGRS', 'coord_display_pref', 'MGRS'),
        ('coordinateFormat', 'DD', 'coord_display_pref', 'DD'),
        ('coordinateFormat', 'DM', 'coord_display_pref', 'DM'),
        ('coordinateFormat', 'DMS', 'coord_display_pref', 'DMS'),
        ('coordinateFormat', 'UTM', 'coord_display_pref', 'UTM'),
        ('altitudeReference', 'HAE', 'alt_display_pref', 'HAE'),
        ('altitudeReference', 'MSL', 'alt_display_pref', 'MSL'),
        ('altitudeUnit', 'feet', 'alt_unit_pref', '0'),
        ('altitudeUnit', 'meters', 'alt_unit_pref', '1'),
        ('speedUnit', 'mph', 'speed_unit_pref', '0'),
        ('speedUnit', 'kmh', 'speed_unit_pref', '1'),
        ('speedUnit', 'knots', 'speed_unit_pref', '2'),
        ('speedUnit', 'mps', 'speed_unit_pref', '3'),
        ('distanceUnit', 'imperial', 'rab_rng_units_pref', '0'),
        ('distanceUnit', 'metric', 'rab_rng_units_pref', '1'),
        ('distanceUnit', 'nautical', 'rab_rng_units_pref', '2'),
        ('northReference', 'true', 'rab_north_ref_pref', '0'),
        ('northReference', 'magnetic', 'rab_north_ref_pref', '1'),
        ('northReference', 'grid', 'rab_north_ref_pref', '2')
)
INSERT OR REPLACE INTO "AtakPreferenceEntry" ("id", "eventId", "targetKey", "preference", "key", "type", "value")
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-'
        || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    "TakConfiguration"."eventId",
    'event',
    'com.atakmap.app_preferences',
    "choice"."key",
    'string',
    "choice"."value"
FROM "TakConfiguration"
JOIN "choice" ON json_extract("TakConfiguration"."atakSettings", '$.' || "choice"."name") = "choice"."chosen"
WHERE "TakConfiguration"."atakSettings" IS NOT NULL;

INSERT INTO "AtakPreferenceList" ("eventId", "version", "updatedAt")
SELECT DISTINCT "eventId", 1, CURRENT_TIMESTAMP FROM "AtakPreferenceEntry";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TakConfiguration" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "meshChannelId" TEXT,
    "groupMode" TEXT NOT NULL DEFAULT 'off',
    "groupsInApp" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TakConfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TakConfiguration_meshChannelId_fkey" FOREIGN KEY ("meshChannelId") REFERENCES "MeshtasticChannel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TakConfiguration" ("createdAt", "eventId", "groupMode", "groupsInApp", "meshChannelId", "updatedAt", "version") SELECT "createdAt", "eventId", "groupMode", "groupsInApp", "meshChannelId", "updatedAt", "version" FROM "TakConfiguration";
DROP TABLE "TakConfiguration";
ALTER TABLE "new_TakConfiguration" RENAME TO "TakConfiguration";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
