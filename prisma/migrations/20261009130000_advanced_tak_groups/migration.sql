-- AlterTable
ALTER TABLE "TakConfiguration" ADD COLUMN "groupsInApp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TakGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TakGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TakGroupMembership" (
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "receive" BOOLEAN NOT NULL,
    "send" BOOLEAN NOT NULL,

    PRIMARY KEY ("groupId", "memberId"),
    CONSTRAINT "TakGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TakGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TakGroupMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "EventMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TakGroup_eventId_name_key" ON "TakGroup"("eventId", "name");

-- CreateIndex
CREATE INDEX "TakGroupMembership_memberId_idx" ON "TakGroupMembership"("memberId");
