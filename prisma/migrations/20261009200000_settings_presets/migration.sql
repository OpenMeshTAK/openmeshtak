-- CreateTable
CREATE TABLE "SettingsPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SettingsPreset_kind_createdAt_id_idx" ON "SettingsPreset"("kind", "createdAt", "id");

-- CreateIndex
CREATE INDEX "SettingsPreset_createdAt_id_idx" ON "SettingsPreset"("createdAt", "id");
