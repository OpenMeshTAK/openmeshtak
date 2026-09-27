-- AlterTable
ALTER TABLE "DataPackage" ADD COLUMN "installOnEnrollment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DataPackage" ADD COLUMN "installOnConnection" BOOLEAN NOT NULL DEFAULT false;
