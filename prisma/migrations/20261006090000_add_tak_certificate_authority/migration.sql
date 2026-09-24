-- CreateTable
CREATE TABLE "TakCertificateAuthority" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "origin" TEXT NOT NULL,
    "certificatePem" TEXT NOT NULL,
    "keyEnvelope" TEXT NOT NULL,
    "fingerprintSha256" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "notBefore" DATETIME NOT NULL,
    "notAfter" DATETIME NOT NULL,
    "activeSlot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TakCertificateAuthority_fingerprintSha256_key" ON "TakCertificateAuthority"("fingerprintSha256");

-- CreateIndex
CREATE UNIQUE INDEX "TakCertificateAuthority_activeSlot_key" ON "TakCertificateAuthority"("activeSlot");
