-- AlterTable
ALTER TABLE "UserGroup" ADD COLUMN "systemKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_systemKey_key" ON "UserGroup"("systemKey");

-- Mark the Admin group created by first-administrator setup as the protected system group.
UPDATE "UserGroup" SET "systemKey" = 'administrators' WHERE "slug" = 'admin';
