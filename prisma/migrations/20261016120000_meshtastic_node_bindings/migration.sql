-- Meshtastic nodes of an event and their operator-confirmed bindings to members, for the mesh
-- uplink. One node per member; removing the member removes the binding, not the node.
-- CreateTable
CREATE TABLE "MeshtasticNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "shortName" TEXT,
    "longName" TEXT,
    "lastHeardAt" DATETIME,
    "lastPositionAt" DATETIME,
    "memberId" TEXT,
    "boundAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeshtasticNode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeshtasticNode_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "EventMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MeshtasticNode_memberId_key" ON "MeshtasticNode"("memberId");

-- CreateIndex
CREATE INDEX "MeshtasticNode_eventId_createdAt_id_idx" ON "MeshtasticNode"("eventId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MeshtasticNode_eventId_nodeId_key" ON "MeshtasticNode"("eventId", "nodeId");

-- Binding nodes to members is member management; whoever manages members keeps that ability.
INSERT OR IGNORE INTO "PermissionGrant" ("id", "userGroupId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), "userGroupId", 'mesh-bindings.manage', "scopeKey", "eventId", "createdAt"
FROM "PermissionGrant" WHERE "permission" = 'members.manage';

INSERT OR IGNORE INTO "ApiClientPermissionGrant" ("id", "apiClientId", "permission", "scopeKey", "eventId", "createdAt")
SELECT lower(hex(randomblob(16))), "apiClientId", 'mesh-bindings.manage', "scopeKey", "eventId", "createdAt"
FROM "ApiClientPermissionGrant" WHERE "permission" = 'members.manage';
