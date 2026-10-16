-- Mesh uplink: packets HQs uploaded are remembered for a bounded window to drop repeats, and
-- recorded traffic keeps its source (TAK or mesh, which node and HQ). Mesh nodes nobody is bound
-- to have no user, so the recorded user becomes optional.
-- CreateTable
CREATE TABLE "MeshPacketReceipt" (
    "eventId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "packetId" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("eventId", "nodeId", "packetId"),
    CONSTRAINT "MeshPacketReceipt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TakTrafficItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "callsign" TEXT,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "time" DATETIME NOT NULL,
    "stale" DATETIME NOT NULL,
    "how" TEXT,
    "ce" REAL,
    "selfReported" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'tak',
    "meshNodeId" TEXT,
    "meshHqId" TEXT,
    "meshHqName" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TakTrafficItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TakTrafficItem" ("callsign", "ce", "eventId", "how", "id", "lat", "lon", "receivedAt", "selfReported", "stale", "time", "type", "uid", "userId") SELECT "callsign", "ce", "eventId", "how", "id", "lat", "lon", "receivedAt", "selfReported", "stale", "time", "type", "uid", "userId" FROM "TakTrafficItem";
DROP TABLE "TakTrafficItem";
ALTER TABLE "new_TakTrafficItem" RENAME TO "TakTrafficItem";
CREATE INDEX "TakTrafficItem_eventId_receivedAt_idx" ON "TakTrafficItem"("eventId", "receivedAt");
CREATE INDEX "TakTrafficItem_eventId_time_idx" ON "TakTrafficItem"("eventId", "time");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MeshPacketReceipt_createdAt_idx" ON "MeshPacketReceipt"("createdAt");
