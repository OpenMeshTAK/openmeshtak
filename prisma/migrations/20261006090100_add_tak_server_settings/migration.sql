-- CreateTable
CREATE TABLE "TakServerCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "caId" TEXT,
    "certificateChainPem" TEXT NOT NULL,
    "keyEnvelope" TEXT NOT NULL,
    "fingerprintSha256" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "notAfter" DATETIME NOT NULL,
    "activeSlot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TakServerSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "hostName" TEXT,
    "enrollmentPort" INTEGER NOT NULL DEFAULT 8446,
    "martiPort" INTEGER NOT NULL DEFAULT 8443,
    "streamingPort" INTEGER NOT NULL DEFAULT 8089,
    "clientCertificateDays" INTEGER NOT NULL DEFAULT 365,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TakServerCertificate_activeSlot_key" ON "TakServerCertificate"("activeSlot");
