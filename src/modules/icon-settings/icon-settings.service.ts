import { createHash, randomUUID } from "node:crypto";
import { Prisma, type IconSettings } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { notFoundProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { logger } from "../../shared/logging/logger.js";
import { removeBlob, writeBlob } from "../../shared/storage/blob-storage.js";
import { readIconArchiveImage } from "../data-packages/atak/icon-archive.js";
import { readIconDatabase } from "../data-packages/atak/icon-database.js";
import type { PackageIconDto } from "../data-packages/icon-library.dto.js";
import type { IconSettingsDto, InstanceIconCatalogue, UpdateIconSettingsResult } from "./icon-settings.dto.js";

const SETTINGS_ID = "icons";
function requireUser(principal: Principal): void {
  if (principal.type !== "user") throw notFoundProblem();
}
function iconsOf(row: IconSettings | null): PackageIconDto[] {
  return row === null ? [] : row.icons as unknown as PackageIconDto[];
}
function summary(row: IconSettings | null): IconSettingsDto {
  const icons = iconsOf(row);
  return {
    version: row?.version ?? 0, icons: icons.length,
    sets: new Set(icons.map((icon) => icon.path.split("/")[0])).size,
    groups: new Set(icons.map((icon) => icon.path.slice(0, icon.path.lastIndexOf("/")))).size,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}
export async function getIconSettings(principal: Principal): Promise<IconSettingsDto> {
  requireUser(principal);
  return summary(await database.iconSettings.findUnique({ where: { id: SETTINGS_ID } }));
}
export async function instanceIconCatalogue(principal: Principal): Promise<InstanceIconCatalogue> {
  requireUser(principal);
  const row = await database.iconSettings.findUnique({ where: { id: SETTINGS_ID } });
  return { version: row?.version ?? 0, icons: iconsOf(row) };
}
export async function instanceIconImage(principal: Principal, version: number, iconId: string): Promise<Uint8Array> {
  requireUser(principal);
  const row = await database.iconSettings.findUnique({ where: { id: SETTINGS_ID }, include: { blob: true } });
  if (row === null || row.version !== version || row.blob === null || !iconsOf(row).some(({ id }) => id === iconId)) throw notFoundProblem();
  return readIconArchiveImage(row.blob.storageKey, row.blob.sha256, iconId);
}

/** Global icon bytes are never put into package revisions, so only this setting owns them. */
async function removePreviousBlob(blobId: string | null): Promise<void> {
  if (blobId === null) return;
  // Cleanup must not turn a committed settings update into a failed response.
  try {
    const blob = await database.storageBlob.findUnique({ where: { id: blobId } });
    if (blob === null) return;
    const removed = await database.storageBlob.deleteMany({ where: { id: blobId, iconSettings: { none: {} }, packageContents: { none: {} } } });
    if (removed.count === 1) await removeBlob(blob.storageKey);
  } catch (error: unknown) {
    logger.warn({ error, event: "icon_library_remove_failed", blobId }, "Old icon library could not be removed");
  }
}

export async function updateIconSettings(actor: ActorContext, version: number, bytes: Uint8Array): Promise<UpdateIconSettingsResult> {
  await requirePermission(actor.principal, "settings.manage");
  const before = await database.iconSettings.findUnique({ where: { id: SETTINGS_ID } });
  if ((before?.version ?? 0) !== version) throw versionConflictProblem(before?.version ?? 0);
  const parsed = await readIconDatabase(bytes);
  const storageKey = await writeBlob(parsed.bytes);
  let saved: IconSettings;
  try {
    saved = await database.$transaction(async (transaction) => {
      const blob = await transaction.storageBlob.create({ data: {
        id: randomUUID(), storageKey, sha256: createHash("sha256").update(parsed.bytes).digest("hex"), size: parsed.bytes.length, mediaType: "application/zip",
      } });
      const data = { blobId: blob.id, icons: parsed.icons as unknown as Prisma.InputJsonValue };
      if (version === 0) {
        await transaction.iconSettings.create({ data: { id: SETTINGS_ID, ...data } });
      } else {
        const changed = await transaction.iconSettings.updateMany({ where: { id: SETTINGS_ID, version }, data: { ...data, version: { increment: 1 } } });
        if (changed.count !== 1) throw versionConflictProblem((await transaction.iconSettings.findUnique({ where: { id: SETTINGS_ID } }))?.version ?? 0);
      }
      await recordAudit({ actor: actor.principal, action: "icon-settings.updated", targetType: "icon-settings", targetId: SETTINGS_ID, result: "success", traceId: actor.traceId, metadata: { accepted: parsed.icons.length, rejected: parsed.rejected.length } }, transaction);
      return transaction.iconSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
    });
  } catch (error: unknown) {
    try { await removeBlob(storageKey); }
    catch (cleanupError: unknown) { logger.warn({ error: cleanupError, event: "icon_library_remove_failed" }, "Uncommitted icon library could not be removed"); }
    if (isUniqueConstraintError(error)) throw versionConflictProblem((await database.iconSettings.findUnique({ where: { id: SETTINGS_ID } }))?.version ?? 0);
    throw error;
  }
  await removePreviousBlob(before?.blobId ?? null);
  return { settings: summary(saved), accepted: parsed.icons.length, rejected: parsed.rejected };
}

export async function clearIconSettings(actor: ActorContext, version: number): Promise<IconSettingsDto> {
  await requirePermission(actor.principal, "settings.manage");
  const before = await database.iconSettings.findUnique({ where: { id: SETTINGS_ID } });
  if ((before?.version ?? 0) !== version) throw versionConflictProblem(before?.version ?? 0);
  if (before === null) return summary(null);
  const saved = await database.$transaction(async (transaction) => {
    const removed = await transaction.iconSettings.updateMany({ where: { id: SETTINGS_ID, version }, data: { blobId: null, icons: [], version: { increment: 1 } } });
    if (removed.count !== 1) throw versionConflictProblem((await transaction.iconSettings.findUnique({ where: { id: SETTINGS_ID } }))?.version ?? 0);
    await recordAudit({ actor: actor.principal, action: "icon-settings.cleared", targetType: "icon-settings", targetId: SETTINGS_ID, result: "success", traceId: actor.traceId }, transaction);
    return transaction.iconSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
  });
  await removePreviousBlob(before.blobId);
  return summary(saved);
}
