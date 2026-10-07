-- AlterTable
ALTER TABLE "DataPackage" ADD COLUMN "draftHash" TEXT;

-- AlterTable
ALTER TABLE "PackageRevision" ADD COLUMN "exportSize" INTEGER;
