-- CreateTable
CREATE TABLE "TakEnrollmentToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TakEnrollmentToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TakClientCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "caId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "fingerprintSha256" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "clientUid" TEXT,
    "notBefore" DATETIME NOT NULL,
    "notAfter" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "revocationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TakClientCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DomainUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TakEnrollmentToken_tokenHash_key" ON "TakEnrollmentToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TakEnrollmentToken_userId_idx" ON "TakEnrollmentToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TakClientCertificate_serialNumber_key" ON "TakClientCertificate"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TakClientCertificate_fingerprintSha256_key" ON "TakClientCertificate"("fingerprintSha256");

-- CreateIndex
CREATE INDEX "TakClientCertificate_userId_idx" ON "TakClientCertificate"("userId");
