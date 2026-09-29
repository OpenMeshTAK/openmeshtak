import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { notFoundProblem, validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import type { MapSettingsDto, UpdateMapSettingsRequest } from "./map-settings.dto.js";

const SETTINGS_ID = "map";

/**
 * The zero-cost default for development and small installations. Its tile usage policy forbids
 * heavy use and bulk downloads, so production installations should configure their own provider.
 */
const DEFAULT_MAP: Omit<MapSettingsDto, "version"> = {
  providerName: "OpenStreetMap",
  tileUrlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19,
};

async function loadMapSettings(): Promise<MapSettingsDto> {
  const row = await database.mapSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row === null
    ? { ...DEFAULT_MAP, version: 0 }
    : { providerName: row.providerName, tileUrlTemplate: row.tileUrlTemplate, attribution: row.attribution, maxZoom: row.maxZoom, version: row.version };
}

/** Every signed-in user sees maps, so every signed-in user may read where the tiles come from. */
export async function getMapSettings(principal: Principal): Promise<MapSettingsDto> {
  if (principal.type !== "user") {
    throw notFoundProblem();
  }
  return loadMapSettings();
}

/**
 * Tiles load directly in every user's browser, so only HTTPS templates (HTTP for localhost during
 * development) with all three tile coordinates are accepted.
 */
function templateProblem(template: string): string | null {
  let url: URL;
  try {
    url = new URL(template.replace(/\{[^}]+\}/g, "0"));
  } catch {
    return "Use a full tile URL such as https://tile.example.org/{z}/{x}/{y}.png.";
  }
  const localHttp = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !localHttp) {
    return "Tile URLs must use HTTPS.";
  }
  if (!["{z}", "{x}"].every((part) => template.includes(part)) || !/\{-?y\}/.test(template)) {
    return "The URL needs the placeholders {z}, {x} and {y}.";
  }
  return null;
}

export async function updateMapSettings(actor: ActorContext, input: UpdateMapSettingsRequest): Promise<MapSettingsDto> {
  await requirePermission(actor.principal, "settings.manage");
  const problem = templateProblem(input.tileUrlTemplate.trim());
  if (problem !== null) {
    throw validationProblem([{ field: "tileUrlTemplate", code: "INVALID_TILE_URL", message: problem }]);
  }
  const { version, ...rest } = input;
  const data = { ...rest, tileUrlTemplate: rest.tileUrlTemplate.trim(), attribution: rest.attribution.trim() };
  await database.$transaction(async (transaction) => {
    if (version === 0) {
      try {
        await transaction.mapSettings.create({ data: { id: SETTINGS_ID, ...data } });
      } catch (error: unknown) {
        throw isUniqueConstraintError(error) ? versionConflictProblem((await loadMapSettings()).version) : error;
      }
    } else {
      const updated = await transaction.mapSettings.updateMany({ where: { id: SETTINGS_ID, version }, data: { ...data, version: { increment: 1 } } });
      if (updated.count !== 1) {
        throw versionConflictProblem((await loadMapSettings()).version);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "map-settings.updated",
        targetType: "map-settings",
        targetId: SETTINGS_ID,
        result: "success",
        traceId: actor.traceId,
        metadata: { providerName: data.providerName, tileUrlTemplate: data.tileUrlTemplate },
      },
      transaction,
    );
  });
  return loadMapSettings();
}
