import type { Prisma} from "../../generated/prisma/client.js";
import type { MapSettings } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { notFoundProblem, validationProblem, versionConflictProblem, type ProblemFieldError } from "../../shared/errors/problem-error.js";
import type { BaseMapFields, BaseMapLayerDto, MapSettingsDto, UpdateMapSettingsRequest } from "./map-settings.dto.js";

const SETTINGS_ID = "map";
const DEFAULT_LAYER_ID = "00000000-0000-4000-8000-000000000001";
/** OSM's public service is the development default; production operators configure their provider. */
const DEFAULT_MAP: BaseMapFields = {
  providerName: "OpenStreetMap",
  tileUrlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19,
};

function settingsOf(row: MapSettings | null): MapSettingsDto {
  const legacy: BaseMapLayerDto = {
    id: DEFAULT_LAYER_ID,
    providerName: row?.providerName ?? DEFAULT_MAP.providerName,
    tileUrlTemplate: row?.tileUrlTemplate ?? DEFAULT_MAP.tileUrlTemplate,
    attribution: row?.attribution ?? DEFAULT_MAP.attribution,
    maxZoom: row?.maxZoom ?? DEFAULT_MAP.maxZoom,
  };
  const stored = row?.layers as unknown as BaseMapLayerDto[] | null | undefined;
  const layers = stored?.length ? stored : [legacy];
  const selected = layers.find(({ id }) => id === row?.defaultLayerId) ?? layers[0] ?? legacy;
  const { id, ...fields } = selected;
  return { ...fields, layers, defaultLayerId: id, version: row?.version ?? 0 };
}
async function loadMapSettings(): Promise<MapSettingsDto> {
  return settingsOf(await database.mapSettings.findUnique({ where: { id: SETTINGS_ID } }));
}

/** All signed-in users may read providers; changes remain settings.manage-only. */
export async function getMapSettings(principal: Principal): Promise<MapSettingsDto> {
  if (principal.type !== "user") throw notFoundProblem();
  return loadMapSettings();
}

function templateProblem(template: string): string | null {
  let url: URL;
  try { url = new URL(template.replace(/\{[^}]+\}/g, "0")); }
  catch { return "Use a full tile URL such as https://tile.example.org/{z}/{x}/{y}.png."; }
  const localHttp = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !localHttp) return "Tile URLs must use HTTPS.";
  if (url.username || url.password || url.hash) return "Tile URLs must not contain a username, password or fragment.";
  if (!["{z}", "{x}"].every((part) => template.includes(part)) || !/\{-?y\}/.test(template)) return "The URL needs the placeholders {z}, {x} and {y}.";
  return null;
}

function normalizedLayers(input: UpdateMapSettingsRequest, current: MapSettingsDto): { layers: BaseMapLayerDto[]; defaultLayerId: string } {
  // Older clients update the default only; they must not discard other configured maps.
  const proposed = input.layers ?? current.layers.map((layer) => layer.id === current.defaultLayerId ? {
    ...layer, providerName: input.providerName, tileUrlTemplate: input.tileUrlTemplate, attribution: input.attribution, maxZoom: input.maxZoom,
  } : layer);
  const layers = proposed.map((layer) => ({ ...layer, id: layer.id.toLowerCase(), providerName: layer.providerName.trim(), tileUrlTemplate: layer.tileUrlTemplate.trim(), attribution: layer.attribution.trim() }));
  const defaultLayerId = (input.layers === undefined ? current.defaultLayerId : input.defaultLayerId ?? layers[0]?.id ?? "").toLowerCase();
  const errors: ProblemFieldError[] = [];
  if (layers.length < 1 || layers.length > 10) errors.push({ field: "layers", code: "INVALID_LAYER_COUNT", message: "Configure between one and ten base maps." });
  if (new Set(layers.map(({ id }) => id)).size !== layers.length) errors.push({ field: "layers", code: "DUPLICATE_LAYER_ID", message: "Each base map needs a different ID." });
  if (!layers.some(({ id }) => id === defaultLayerId)) errors.push({ field: "defaultLayerId", code: "UNKNOWN_LAYER", message: "Choose a default from the configured base maps." });
  if (input.layers === undefined && input.defaultLayerId !== undefined && input.defaultLayerId.toLowerCase() !== current.defaultLayerId) errors.push({ field: "defaultLayerId", code: "LAYERS_REQUIRED", message: "Supply the layers when changing the default map." });
  layers.forEach((layer, index) => {
    const prefix = input.layers === undefined ? "" : `layers.${index}.`;
    if (!layer.providerName) errors.push({ field: `${prefix}providerName`, code: "REQUIRED", message: "Enter a map name." });
    if (!layer.attribution) errors.push({ field: `${prefix}attribution`, code: "REQUIRED", message: "Enter the provider's required attribution." });
    const problem = templateProblem(layer.tileUrlTemplate);
    if (problem !== null) errors.push({ field: `${prefix}tileUrlTemplate`, code: "INVALID_TILE_URL", message: problem });
  });
  if (errors.length) throw validationProblem(errors);
  return { layers, defaultLayerId };
}

export async function updateMapSettings(actor: ActorContext, input: UpdateMapSettingsRequest): Promise<MapSettingsDto> {
  await requirePermission(actor.principal, "settings.manage");
  const current = await loadMapSettings();
  if (current.version !== input.version) throw versionConflictProblem(current.version);
  const { layers, defaultLayerId } = normalizedLayers(input, current);
  const selected = layers.find(({ id }) => id === defaultLayerId);
  if (selected === undefined) throw validationProblem([{ field: "defaultLayerId", code: "UNKNOWN_LAYER", message: "Choose a default from the configured base maps." }]);
  const data = {
    providerName: selected.providerName, tileUrlTemplate: selected.tileUrlTemplate, attribution: selected.attribution,
    maxZoom: selected.maxZoom, layers: layers as unknown as Prisma.InputJsonValue, defaultLayerId,
  };
  try {
    const saved = await database.$transaction(async (transaction) => {
      if (input.version === 0) {
        await transaction.mapSettings.create({ data: { id: SETTINGS_ID, ...data } });
      } else {
        const updated = await transaction.mapSettings.updateMany({ where: { id: SETTINGS_ID, version: input.version }, data: { ...data, version: { increment: 1 } } });
        if (updated.count !== 1) throw versionConflictProblem((await transaction.mapSettings.findUnique({ where: { id: SETTINGS_ID } }))?.version ?? 0);
      }
      await recordAudit({ actor: actor.principal, action: "map-settings.updated", targetType: "map-settings", targetId: SETTINGS_ID, result: "success", traceId: actor.traceId, metadata: { layerCount: layers.length, defaultLayerId } }, transaction);
      return transaction.mapSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
    });
    return settingsOf(saved);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) throw versionConflictProblem((await loadMapSettings()).version);
    throw error;
  }
}
