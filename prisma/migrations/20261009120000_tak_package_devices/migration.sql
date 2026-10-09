-- AlterTable
ALTER TABLE "TakClientCertificate" ADD COLUMN "firstConnectedAt" DATETIME;
ALTER TABLE "TakClientCertificate" ADD COLUMN "lastConnectedAt" DATETIME;
ALTER TABLE "TakClientCertificate" ADD COLUMN "deviceName" TEXT;
ALTER TABLE "TakClientCertificate" ADD COLUMN "deviceApp" TEXT;
ALTER TABLE "TakClientCertificate" ADD COLUMN "deviceAppVersion" TEXT;
ALTER TABLE "TakClientCertificate" ADD COLUMN "deviceOs" TEXT;
ALTER TABLE "TakClientCertificate" ADD COLUMN "deviceCallsign" TEXT;

-- AlterTable
ALTER TABLE "TakServerSettings" ADD COLUMN "unusedPackageHours" INTEGER NOT NULL DEFAULT 24;
