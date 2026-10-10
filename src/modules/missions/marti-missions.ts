import { randomBytes, randomUUID } from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import type { PackageRevision } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { database } from "../../shared/database/database.js";
import { objectToCotEvents } from "../data-packages/atak/cot-export.js";
import type { PackageSnapshot } from "../data-packages/package-snapshot.js";
import type { AuthenticatedTakClient } from "../tak-server/client-authentication.js";
import { cotRouter } from "../tak-server/streaming/cot-router.js";
import { findVisibleMission, visibleMissionsFor, type VisibleMission } from "./mission-access.js";
import { apiResponse, missionChangeJson, missionFileChangeJson, missionHistory, missionJson, missionSubscriptionJson } from "./mission-format.js";
import "./mission-sync.js";
import { addMissionFile, removeMissionFile } from "./mission-file-writes.js";
import { missionFileByHash } from "./mission-files.js";
import { writeMissionItem } from "./mission-writes.js";
import { forgetUpload, pendingUpload, type UploadedFile } from "./tak-uploads.js";

type Locals = { client: AuthenticatedTakClient };
type Handler = (request: Request, response: Response<unknown, Locals>) => Promise<void>;

const MAX_CLIENT_UID_LENGTH = 200;

function clientUidOf(request: Request): string | null {
  const uid = request.query.uid;
  return typeof uid === "string" && uid.length > 0 && uid.length <= MAX_CLIENT_UID_LENGTH ? uid : null;
}

/** The mission named in the path (`:name`) or by GUID (`:guid`), if the caller may see it. */
async function missionOf(request: Request, response: Response<unknown, Locals>): Promise<VisibleMission | null> {
  const { client } = response.locals;
  const { name, guid } = request.params;
  const found = await findVisibleMission(client.userId, client.access, guid === undefined ? { name: String(name) } : { guid });
  if (found === null) {
    response.status(404).end();
  }
  return found;
}

/** `secago`, or `start`/`end`; null when the parameters are invalid. */
function timeWindow(request: Request): { from: Date | null; to: Date | null } | null {
  const { secago, start, end } = request.query;
  if (secago !== undefined) {
    const seconds = Number(secago);
    return Number.isFinite(seconds) && seconds >= 0 ? { from: new Date(Date.now() - seconds * 1000), to: null } : null;
  }
  const from = typeof start === "string" ? new Date(start) : null;
  const to = typeof end === "string" ? new Date(end) : null;
  return (from !== null && Number.isNaN(from.getTime())) || (to !== null && Number.isNaN(to.getTime())) ? null : { from, to };
}

/** TAK Server reports its login name; the display name serves the same informational purpose. */
async function usernameOf(userId: string): Promise<string> {
  const user = await database.domainUser.findUnique({ where: { id: userId }, select: { displayName: true } });
  return user?.displayName ?? "";
}

const listMissions: Handler = async (_request, response) => {
  const { client } = response.locals;
  const visible = await visibleMissionsFor(client.userId, client.access);
  const data = await Promise.all(visible.map(({ mission, latest, canWrite }) => missionJson(mission, latest, canWrite, null)));
  response.json(apiResponse("Mission", data));
};

const getMission: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  if (found !== null) {
    response.json(apiResponse("Mission", [await missionJson(found.mission, found.latest, found.canWrite, null)]));
  }
};

const subscribe: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  const clientUid = clientUidOf(request);
  if (found === null) {
    return;
  }
  if (clientUid === null) {
    response.status(400).end();
    return;
  }
  const { client } = response.locals;
  const subscription = await database.missionSubscription.upsert({
    where: { packageId_clientUid: { packageId: found.mission.id, clientUid } },
    create: { id: randomUUID(), packageId: found.mission.id, userId: client.userId, clientUid, token: randomBytes(24).toString("base64url") },
    update: { userId: client.userId },
  });
  await recordAudit({
    actor: { type: "user", id: client.userId },
    action: "mission.subscribed",
    targetType: "data-package",
    targetId: found.mission.id,
    result: "success",
    metadata: { eventId: found.mission.eventId, clientUid, certificateId: client.certificate.id },
  });
  response.json(
    apiResponse("com.bbn.marti.sync.model.MissionSubscription", missionSubscriptionJson(subscription, await usernameOf(client.userId), found.canWrite)),
  );
};

const getSubscription: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  const clientUid = clientUidOf(request);
  if (found === null) {
    return;
  }
  const subscription =
    clientUid === null ? null : await database.missionSubscription.findUnique({ where: { packageId_clientUid: { packageId: found.mission.id, clientUid } } });
  if (subscription === null || subscription.userId !== response.locals.client.userId) {
    response.status(404).end();
    return;
  }
  response.json(
    apiResponse("com.bbn.marti.sync.model.MissionSubscription", missionSubscriptionJson(subscription, await usernameOf(subscription.userId), found.canWrite)),
  );
};

const unsubscribe: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  const clientUid = clientUidOf(request);
  if (found === null) {
    return;
  }
  if (clientUid !== null) {
    await database.missionSubscription.deleteMany({ where: { packageId: found.mission.id, clientUid, userId: response.locals.client.userId } });
  }
  response.status(200).end();
};

/** The creator UID ATAK names with content changes, falling back to nothing. */
function creatorUidOf(request: Request): string {
  const uid = request.query.creatorUid;
  return typeof uid === "string" && uid.length <= MAX_CLIENT_UID_LENGTH ? uid : "";
}

async function answerWithMission(response: Response<unknown, Locals>, missionId: string): Promise<void> {
  const { client } = response.locals;
  const updated = await findVisibleMission(client.userId, client.access, { guid: missionId });
  response.json(apiResponse("Mission", updated === null ? [] : [await missionJson(updated.mission, updated.latest, updated.canWrite, null)]));
}

function stringsOf(value: unknown, limit: number): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, limit) : [];
}

/**
 * The file a hash names for this user: their own pending upload, or a file of a mission they see
 * (a file can be added to another mission without uploading it again).
 */
async function uploadedFileOf(response: Response<unknown, Locals>, hash: string): Promise<UploadedFile | null> {
  const { client } = response.locals;
  const pending = pendingUpload(client.userId, hash);
  if (pending !== null) {
    return pending;
  }
  const known = await missionFileByHash(client.userId, client.access, hash);
  return known === null ? null : { sha256: hash, fileName: known.file.archivePath.split("/").pop() ?? known.file.name, bytes: known.bytes, uploadedAt: new Date() };
}

/**
 * `PUT …/contents`: adds items already on the map (`{"uids": [...]}`) to the mission, using the
 * newest CoT the server has for each, and files uploaded before (`{"hashes": [...]}`, SHA-256).
 */
const addContents: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  if (found === null) {
    return;
  }
  if (!found.canWrite) {
    response.status(403).end();
    return;
  }
  const body = (request.body ?? {}) as { uids?: unknown; hashes?: unknown };
  const author = { userId: response.locals.client.userId, clientUid: creatorUidOf(request) };
  for (const uid of stringsOf(body.uids, 500)) {
    const xml = cotRouter.currentXml(uid);
    if (xml !== null) {
      await writeMissionItem(found, author, { kind: "upsert", xml });
    }
  }
  for (const hash of stringsOf(body.hashes, 50).map((value) => value.toLowerCase())) {
    const file = /^[0-9a-f]{64}$/.test(hash) ? await uploadedFileOf(response, hash) : null;
    if (file !== null) {
      await addMissionFile(found, author, file);
      forgetUpload(author.userId, hash);
    }
  }
  await answerWithMission(response, found.mission.id);
};

/** `DELETE …/contents?uid=` or `?hash=`: removes an item or a file from the mission. */
const removeContent: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  if (found === null) {
    return;
  }
  if (!found.canWrite) {
    response.status(403).end();
    return;
  }
  const { uid, hash } = request.query;
  const author = { userId: response.locals.client.userId, clientUid: creatorUidOf(request) };
  if (typeof uid === "string") {
    await writeMissionItem(found, author, { kind: "remove", uid });
  }
  if (typeof hash === "string" && /^[0-9a-f]{64}$/i.test(hash)) {
    await removeMissionFile(found, author, hash.toLowerCase());
  }
  await answerWithMission(response, found.mission.id);
};

const getRole: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  if (found !== null) {
    response.json(apiResponse("MissionRole", (await missionJson(found.mission, found.latest, found.canWrite, [])).defaultRole));
  }
};

/** The mission's current items as CoT, the way ATAK loads a mission's map content. */
function cotEvents(latest: PackageRevision): string {
  const snapshot = latest.snapshot as unknown as PackageSnapshot;
  const events = snapshot.objects.flatMap((object) => objectToCotEvents(object, latest.createdAt).map(({ xml }) => xml.replace(/^<\?xml[^>]*>\s*/, "")));
  return `<?xml version="1.0" encoding="UTF-8"?><events>${events.join("")}</events>`;
}

const getCot: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  if (found !== null) {
    response.type("application/xml").send(cotEvents(found.latest));
  }
};

const getChanges: Handler = async (request, response) => {
  const found = await missionOf(request, response);
  const window = timeWindow(request);
  if (found === null) {
    return;
  }
  if (window === null) {
    response.status(400).end();
    return;
  }
  const inWindow = ({ timestamp }: { timestamp: Date }): boolean =>
    (window.from === null || timestamp >= window.from) && (window.to === null || timestamp <= window.to);
  const history = await missionHistory(found.mission.id);
  const changes = [
    ...history.items.filter(inWindow).map((change) => ({ at: change.timestamp, json: missionChangeJson(found.mission, change) })),
    ...history.files.filter(inWindow).map((change) => ({ at: change.timestamp, json: missionFileChangeJson(found.mission, change) })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  response.json(apiResponse("MissionChange", changes.map(({ json }) => json)));
};

/**
 * The parts of TAK Server's Mission API that ATAK's Data Sync uses: list, open, subscribe, load
 * the items as CoT, catch up on changes, and add or remove items and files for members who may write. Every mission is addressed by name or GUID.
 * Specific paths are registered before `:name`, because mission names are free text.
 */
export function registerMissionRoutes(app: Express, wrap: (handler: Handler) => (request: Request, response: Response<unknown, Locals>) => void): void {
  app.get("/Marti/api/missions", wrap(listMissions));
  for (const prefix of ["/Marti/api/missions/guid/:guid", "/Marti/api/missions/:name"]) {
    app.get(`${prefix}/subscription`, wrap(getSubscription));
    app.put(`${prefix}/subscription`, wrap(subscribe));
    app.delete(`${prefix}/subscription`, wrap(unsubscribe));
    app.get(`${prefix}/role`, wrap(getRole));
    app.get(`${prefix}/cot`, wrap(getCot));
    app.get(`${prefix}/changes`, wrap(getChanges));
    app.put(`${prefix}/contents`, express.json({ limit: "256kb" }), wrap(addContents));
    app.delete(`${prefix}/contents`, wrap(removeContent));
    app.get(prefix, wrap(getMission));
  }
}
