import type { TLSSocket } from "node:tls";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { recordAudit } from "../../../shared/audit/audit.js";
import { logger } from "../../../shared/logging/logger.js";
import { buildAtakExport } from "../../data-packages/package-atak.service.js";
import { authenticateTakClient, type AuthenticatedTakClient } from "../client-authentication.js";
import { cotRouter } from "../streaming/cot-router.js";
import { cotScopeFor } from "../streaming/cot-scope.js";
import { loadTakServerSettings } from "../tak-server-settings.js";
import { cotHistory, latestCot } from "./cot-history.js";
import { allGroups, setActiveGroups } from "./server-groups.js";
import { sendDeviceProfile } from "./profile-response.js";
import { exportSummary, visiblePackagesFor, type VisiblePackage } from "./visible-packages.js";

const NODE_ID = "openmeshtak";
const SERVER_VERSION = "OpenMeshTak";

type Locals = { client: AuthenticatedTakClient };

/** Every Marti request carries the TLS client certificate; Core checks it like a stream connection. */
async function authenticate(request: Request, response: Response<unknown, Locals>, next: NextFunction): Promise<void> {
  const raw = (request.socket as TLSSocket).getPeerCertificate?.().raw as Buffer | undefined;
  const client = raw === undefined ? null : await authenticateTakClient(raw);
  if (client === null) {
    response.status(401).end();
    return;
  }
  response.locals.client = client;
  next();
}

/** Formats a time the way TAK Server does in sync search results. */
function martiTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

/**
 * ATAK reads `PrimaryKey` as a non-negative Java int and drops the whole result list otherwise.
 * It downloads by hash and never sends the key back, so a stable number from the hash is enough.
 */
function primaryKeyOf(sha256: string): number {
  return Number.parseInt(sha256.slice(0, 7), 16);
}

async function search(_request: Request, response: Response<unknown, Locals>): Promise<void> {
  const { client } = response.locals;
  const visible = await visiblePackagesFor(client.userId, client.access);
  const results = await Promise.all(
    visible.map(async (item) => {
      const summary = await exportSummary(item);
      return {
        UID: summary.sha256,
        // ATAK treats Name as the package name and appends ".zip" itself when it saves the file.
        Name: summary.fileName.replace(/\.zip$/i, ""),
        Hash: summary.sha256,
        CreatorUid: "OpenMeshTak",
        SubmissionDateTime: martiTime(item.latest.createdAt),
        EXPIRATION: "-1",
        Keywords: ["missionpackage"],
        MIMEType: "application/x-zip-compressed",
        Size: String(summary.size),
        SubmissionUser: "OpenMeshTak",
        PrimaryKey: primaryKeyOf(summary.sha256),
        Tool: "public",
      };
    }),
  );
  response.json({ resultCount: results.length, results });
}

async function findByHash(client: AuthenticatedTakClient, hash: unknown): Promise<VisiblePackage | null> {
  if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
    return null;
  }
  for (const item of await visiblePackagesFor(client.userId, client.access)) {
    if ((await exportSummary(item)).sha256 === hash) {
      return item;
    }
  }
  return null;
}

async function content(request: Request, response: Response<unknown, Locals>): Promise<void> {
  const { client } = response.locals;
  const item = await findByHash(client, request.query.hash);
  if (item === null) {
    response.status(404).end();
    return;
  }
  if (request.method === "HEAD") {
    response.status(200).end();
    return;
  }
  const artifact = await buildAtakExport(item.dataPackage.id, item.latest);
  await recordAudit({
    actor: { type: "user", id: client.userId },
    action: "data-package.downloaded",
    targetType: "data-package",
    targetId: item.dataPackage.id,
    result: "success",
    metadata: { eventId: item.dataPackage.eventId, revision: item.latest.number, via: "tak-server", certificateId: client.certificate.id },
  });
  response.attachment(artifact.fileName).type("application/zip").send(Buffer.from(artifact.bytes));
}

async function missionQuery(request: Request, response: Response<unknown, Locals>): Promise<void> {
  const item = await findByHash(response.locals.client, request.query.hash);
  response.status(item === null ? 404 : 200).end();
}

/**
 * Called by ATAK on every connection when device profiles are enabled. `syncSecago` is how many
 * seconds ago the app last synced; only packages published since then are delivered.
 */
async function connectionProfile(request: Request, response: Response<unknown, Locals>): Promise<void> {
  const { client } = response.locals;
  const seconds = Number(request.query.syncSecago);
  const changedSince = Number.isFinite(seconds) && seconds > 0 ? new Date(Date.now() - seconds * 1000) : null;
  await sendDeviceProfile(response, client.userId, client.access, "connection", changedSince);
}

/**
 * The server contact list ATAK shows next to the contacts it heard itself: every app of the
 * caller's events that reported its position since Core started, including disconnected ones.
 * ATAK parses `lastEventTime` as UTC with milliseconds and `lastStatus` as Connected or Disconnected.
 */
function clientEndPoints(_request: Request, response: Response<unknown, Locals>): void {
  const { client } = response.locals;
  const data = cotRouter.contacts(cotScopeFor(client.access)).map((device) => ({
    uid: device.uid,
    callsign: device.callsign,
    lastEventTime: device.lastEventTime.toISOString(),
    lastStatus: device.peerId === null ? "Disconnected" : "Connected",
  }));
  response.json({ version: "3", type: "com.bbn.marti.remote.ClientEndpoint", data, nodeId: NODE_ID });
}

async function versionConfig(_request: Request, response: Response): Promise<void> {
  const { hostName } = await loadTakServerSettings();
  response.json({ version: "3", type: "ServerConfig", data: { version: SERVER_VERSION, api: "3", hostname: hostName }, nodeId: NODE_ID });
}

function wrap(handler: (request: Request, response: Response<unknown, Locals>) => Promise<void>) {
  return (request: Request, response: Response<unknown, Locals>): void => {
    handler(request, response).catch((error: unknown) => {
      logger.error({ error, event: "tak_marti_request_failed" }, "TAK Marti request failed");
      if (!response.headersSent) {
        response.status(500).end();
      }
    });
  };
}

/**
 * The Marti API subset Core offers TAK apps: server information, read-only access to published
 * Data Packages, device profiles, the recorded CoT history of events that record their traffic
 * and the TAK groups of the advanced group mode. Uploads and missions are not offered, so their endpoints answer 403 or 404.
 */
export function createMartiApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use((request: Request, response: Response<unknown, Locals>, next: NextFunction) => {
    authenticate(request, response, next).catch(next);
  });
  app.get("/Marti/api/version/config", wrap(versionConfig));
  app.get("/Marti/api/clientEndPoints", clientEndPoints);
  app.get("/Marti/api/groups/all", wrap(allGroups));
  app.put("/Marti/api/groups/active", express.json({ limit: "64kb" }), wrap(setActiveGroups));
  app.get("/Marti/api/device/profile/connection", wrap(connectionProfile));
  app.get("/Marti/api/cot/xml/:uid/all", wrap(cotHistory));
  app.get("/Marti/api/cot/xml/:uid", wrap(latestCot));
  app.get("/Marti/sync/search", wrap(search));
  // Express also routes HEAD here; the handler answers it without a body.
  app.get("/Marti/sync/content", wrap(content));
  app.get("/Marti/sync/missionquery", wrap(missionQuery));
  app.post("/Marti/sync/missionupload", (_request, response) => {
    response.status(403).end();
  });
  app.use((_request, response) => {
    response.status(404).end();
  });
  return app;
}
