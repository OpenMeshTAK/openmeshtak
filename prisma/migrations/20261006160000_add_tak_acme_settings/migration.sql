CREATE TABLE "TakAcmeSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "challengeType" TEXT NOT NULL DEFAULT 'dns-01',
    "provider" TEXT NOT NULL DEFAULT 'cloudflare',
    "cloudflareZoneId" TEXT,
    "apiTokenEnvelope" TEXT,
    "accountKeyEnvelope" TEXT,
    "lastAttemptAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastError" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);
