-- CreateTable
CREATE TABLE "MemberClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "revokedAt" DATETIME,
    "issuedByType" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberClaim_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberClaim_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "EventMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberClaim_tokenHash_key" ON "MemberClaim"("tokenHash");

-- CreateIndex
CREATE INDEX "MemberClaim_memberId_idx" ON "MemberClaim"("memberId");

-- CreateIndex
CREATE INDEX "MemberClaim_eventId_idx" ON "MemberClaim"("eventId");
