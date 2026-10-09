import { randomUUID } from "node:crypto";
import type { DataPackage, PackageRevision } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { objectCotSummary } from "../data-packages/atak/cot-export.js";
import type { PackageSnapshot, PackageSnapshotContent, PackageSnapshotObject } from "../data-packages/package-snapshot.js";

/**
 * The Data Sync wire format of TAK Server's Mission API (`com.bbn.marti.sync.model`), written from
 * its public model classes: JSON responses wrapped as `{version: "3", type, data, nodeId}`, times as
 * UTC with milliseconds, and mission change notifications as `t-x-m-c` CoT events carrying
 * `MissionChanges` XML. Missions are the synced revisions of a mission; the draft never reaches
 * TAK apps.
 */

export const NODE_ID = "openmeshtak";
const MAX_REVISIONS = 500;

export function apiResponse(type: string, data: unknown): { version: string; type: string; data: unknown; nodeId: string } {
  return { version: "3", type, data, nodeId: NODE_ID };
}

export type MissionChangeType = "ADD_CONTENT" | "REMOVE_CONTENT";

/** One item added, changed (added again) or removed by a revision. */
export interface MissionItemChange {
  type: MissionChangeType;
  object: PackageSnapshotObject;
  timestamp: Date;
  creatorUid: string;
}

/** What TAK Server calls `UidDetails`: how a mission item looks without loading its CoT. */
function uidDetails(object: PackageSnapshotObject) {
  const summary = objectCotSummary(object);
  return {
    type: summary.type,
    callsign: object.name,
    ...(object.tak?.iconsetPath ? { iconsetPath: object.tak.iconsetPath } : {}),
    location: { lat: summary.lat, lon: summary.lon },
  };
}

function snapshotOf(revision: PackageRevision): PackageSnapshot {
  // Revisions are written only from validated package snapshots.
  return revision.snapshot as unknown as PackageSnapshot;
}

/** Items added or changed (both reported as ADD_CONTENT, like TAK Server) and removed between two revisions. */
export function changesBetween(previous: PackageSnapshot | null, next: PackageSnapshot, at: Date, creatorUid = ""): MissionItemChange[] {
  const before = new Map((previous?.objects ?? []).map((object) => [object.id, object]));
  const after = new Map(next.objects.map((object) => [object.id, object]));
  const changes: MissionItemChange[] = [];
  for (const object of next.objects) {
    const old = before.get(object.id);
    if (old === undefined || JSON.stringify(old) !== JSON.stringify(object)) {
      changes.push({ type: "ADD_CONTENT", object, timestamp: at, creatorUid });
    }
  }
  for (const object of before.values()) {
    if (!after.has(object.id)) {
      changes.push({ type: "REMOVE_CONTENT", object, timestamp: at, creatorUid });
    }
  }
  return changes;
}

/** One file added, replaced or removed by a revision. */
export interface MissionFileChange {
  type: MissionChangeType;
  file: PackageSnapshotContent;
  timestamp: Date;
  creatorUid: string;
}

/** Files added or replaced (ADD_CONTENT) and removed between two revisions, keyed by content ID. */
export function fileChangesBetween(previous: PackageSnapshot | null, next: PackageSnapshot, at: Date, creatorUid = ""): MissionFileChange[] {
  const before = new Map((previous?.contents ?? []).filter((file) => file.kind !== "icon-library").map((file) => [file.id, file]));
  const after = new Map((next.contents ?? []).filter((file) => file.kind !== "icon-library").map((file) => [file.id, file]));
  const changes: MissionFileChange[] = [];
  for (const file of after.values()) {
    if (before.get(file.id)?.sha256 !== file.sha256) {
      changes.push({ type: "ADD_CONTENT", file, timestamp: at, creatorUid });
    }
  }
  for (const file of before.values()) {
    if (!after.has(file.id)) {
      changes.push({ type: "REMOVE_CONTENT", file, timestamp: at, creatorUid });
    }
  }
  return changes;
}

/**
 * A mission file as TAK Server's `Resource`: Data Sync downloads it by `hash` (SHA-256) from
 * `/Marti/sync/content`.
 */
function resourceJson(file: PackageSnapshotContent, at: Date, creatorUid: string) {
  return {
    filename: file.archivePath.split("/").pop() ?? file.name,
    keywords: [],
    mimeType: file.mediaType,
    name: file.name,
    submissionTime: at.toISOString(),
    submitter: "",
    uid: file.id,
    hash: file.sha256,
    size: file.size,
    creatorUid,
    tool: "public",
  };
}

/** Who made a revision, as the TAK app UID TAK Server reports; empty for changes from the editor. */
export function creatorUidOf(revision: PackageRevision): string {
  return revision.createdByType === "tak-client" ? revision.createdById : "";
}

/** Every item and file change of the mission across its synced revisions, oldest first. */
export async function missionHistory(missionId: string): Promise<{ items: MissionItemChange[]; files: MissionFileChange[] }> {
  const revisions = await database.packageRevision.findMany({
    where: { packageId: missionId },
    orderBy: { number: "desc" },
    take: MAX_REVISIONS,
  });
  revisions.reverse();
  let previous: PackageSnapshot | null = null;
  const items: MissionItemChange[] = [];
  const files: MissionFileChange[] = [];
  for (const revision of revisions) {
    const snapshot = snapshotOf(revision);
    items.push(...changesBetween(previous, snapshot, revision.createdAt, creatorUidOf(revision)));
    files.push(...fileChangesBetween(previous, snapshot, revision.createdAt, creatorUidOf(revision)));
    previous = snapshot;
  }
  return { items, files };
}

export function missionFileChangeJson(mission: DataPackage, change: MissionFileChange) {
  return {
    isFederatedChange: false,
    type: change.type,
    missionName: mission.name,
    missionGuid: mission.id,
    timestamp: change.timestamp.toISOString(),
    creatorUid: change.creatorUid,
    serverTime: change.timestamp.toISOString(),
    contentResource: resourceJson(change.file, change.timestamp, change.creatorUid),
  };
}

export function missionChangeJson(mission: DataPackage, change: MissionItemChange) {
  return {
    isFederatedChange: false,
    type: change.type,
    missionName: mission.name,
    missionGuid: mission.id,
    timestamp: change.timestamp.toISOString(),
    creatorUid: change.creatorUid,
    serverTime: change.timestamp.toISOString(),
    contentUid: change.object.id,
    details: uidDetails(change.object),
  };
}

/** The role a subscription grants: writers may add and change items, everyone else only reads. */
export function missionRoleJson(canWrite: boolean) {
  return canWrite
    ? { type: "MISSION_SUBSCRIBER", permissions: ["MISSION_READ", "MISSION_WRITE"] }
    : { type: "MISSION_READONLY_SUBSCRIBER", permissions: ["MISSION_READ"] };
}

/** A mission with its current items (`uids`), as `GET /Marti/api/missions/{name}` returns it. */
export async function missionJson(mission: DataPackage, latest: PackageRevision, canWrite: boolean, withChanges: MissionItemChange[] | null) {
  const history = withChanges === null ? await missionHistory(mission.id) : { items: withChanges, files: [] };
  const changes = history.items;
  const fileAdded = new Map(history.files.filter(({ type }) => type === "ADD_CONTENT").map((change) => [change.file.id, change]));
  const lastAdded = new Map<string, MissionItemChange>();
  for (const change of changes) {
    if (change.type === "ADD_CONTENT") {
      lastAdded.set(change.object.id, change);
    }
  }
  const snapshot = snapshotOf(latest);
  return {
    name: mission.name,
    description: mission.description ?? "",
    chatRoom: "",
    baseLayer: "",
    bbox: "",
    path: "",
    classification: "",
    tool: "public",
    keywords: [],
    creatorUid: "",
    createTime: mission.createdAt.toISOString(),
    lastEdited: latest.createdAt.toISOString(),
    groups: ["__ANON__"],
    externalData: [],
    feeds: [],
    mapLayers: [],
    defaultRole: missionRoleJson(canWrite),
    inviteOnly: false,
    expiration: -1,
    guid: mission.id,
    passwordProtected: false,
    uids: snapshot.objects.map((object) => {
      const added = lastAdded.get(object.id);
      return {
        data: object.id,
        timestamp: (added?.timestamp ?? latest.createdAt).toISOString(),
        creatorUid: added?.creatorUid ?? "",
        details: uidDetails(object),
      };
    }),
    contents: (snapshot.contents ?? []).filter((file) => file.kind !== "icon-library").map((file) => {
      const added = fileAdded.get(file.id);
      const at = added?.timestamp ?? latest.createdAt;
      return { data: resourceJson(file, at, added?.creatorUid ?? ""), timestamp: at.toISOString(), creatorUid: added?.creatorUid ?? "" };
    }),
  };
}

export function missionSubscriptionJson(subscription: { token: string; clientUid: string; createdAt: Date }, username: string, canWrite: boolean) {
  return {
    token: subscription.token,
    clientUid: subscription.clientUid,
    username,
    createTime: subscription.createdAt.toISOString(),
    role: missionRoleJson(canWrite),
  };
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

function detailsXml(object: PackageSnapshotObject): string {
  const details = uidDetails(object);
  const icon = details.iconsetPath === undefined ? "" : ` iconsetPath="${escapeXml(details.iconsetPath)}"`;
  return `<details type="${escapeXml(details.type)}" callsign="${escapeXml(details.callsign)}"${icon}><location lat="${String(details.location.lat)}" lon="${String(details.location.lon)}"/></details>`;
}

/**
 * The `t-x-m-c` CoT event TAK Server sends to a mission's subscribers after its content changed.
 * Data Sync reads the mission name and GUID from `<mission>` and the changed items from
 * `<MissionChanges>`; the changed items themselves are sent as their own CoT events.
 */
function resourceXml(file: PackageSnapshotContent): string {
  const resource = resourceJson(file, new Date(0), "");
  return (
    `<contentResource><filename>${escapeXml(resource.filename)}</filename><hash>${resource.hash}</hash><mimeType>${escapeXml(resource.mimeType)}</mimeType>` +
    `<name>${escapeXml(resource.name)}</name><size>${String(resource.size)}</size><uid>${escapeXml(resource.uid)}</uid></contentResource>`
  );
}

export function missionChangeNotification(mission: DataPackage, changes: MissionItemChange[], now = new Date(), fileChanges: MissionFileChange[] = []): string {
  const time = now.toISOString();
  const stale = new Date(now.getTime() + 20_000).toISOString();
  const items = changes
    .map(
      (change) =>
        `<MissionChange><contentUid>${escapeXml(change.object.id)}</contentUid><creatorUid>${escapeXml(change.creatorUid)}</creatorUid>` +
        `<isFederatedChange>false</isFederatedChange><missionName>${escapeXml(mission.name)}</missionName>` +
        `<timestamp>${change.timestamp.toISOString()}</timestamp><type>${change.type}</type>${detailsXml(change.object)}</MissionChange>`,
    )
    .join("");
  const files = fileChanges
    .map(
      (change) =>
        `<MissionChange><creatorUid>${escapeXml(change.creatorUid)}</creatorUid><isFederatedChange>false</isFederatedChange>` +
        `<missionName>${escapeXml(mission.name)}</missionName><timestamp>${change.timestamp.toISOString()}</timestamp><type>${change.type}</type>${resourceXml(change.file)}</MissionChange>`,
    )
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="${randomUUID()}" type="t-x-m-c" how="h-g-i-g-o" time="${time}" start="${time}" stale="${stale}">` +
    `<point lat="0" lon="0" hae="0" ce="9999999" le="9999999"/>` +
    `<detail><mission type="CHANGE" tool="public" name="${escapeXml(mission.name)}" guid="${mission.id}"><MissionChanges>${items}${files}</MissionChanges></mission></detail></event>`
  );
}
