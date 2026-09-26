import type { TLSSocket } from "node:tls";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { recordAudit } from "../../../shared/audit/audit.js";
import { logger } from "../../../shared/logging/logger.js";
import { buildAtakExport } from "../../data-packages/package-atak.service.js";
import { authenticateTakClient, type AuthenticatedTakClient } from "../client-authentication.js";
import { loadTakServerSettings } from "../tak-server-settings.js";
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

async function search(_request: Request, response: Response<unknown, Locals>): Promise<void> {
  const { client } = response.locals;
  const visible = await visiblePackagesFor(client.userId, client.access);
  const results = await Promise.all(
    visible.map(async (item) => {
      const summary = await exportSummary(item);
      return {
        UID: summary.sha256,
        Name: summary.fileName,
        Hash: summary.sha256,
        CreatorUid: "OpenMeshTak",
        SubmissionDateTime: martiTime(item.latest.createdAt),
        EXPIRATION: "-1",
        Keywords: ["missionpackage"],
        MIMEType: "application/x-zip-compressed",
        Size: String(summary.size),
        SubmissionUser: "OpenMeshTak",
        PrimaryKey: item.latest.id,
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
 * The Marti API subset RC1 offers TAK apps: server information and read-only access to published
 * Data Packages. Uploads and missions are outside RC1, so their endpoints answer 403 or 404.
 */
export function createMartiApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use((request: Request, response: Response<unknown, Locals>, next: NextFunction) => {
    authenticate(request, response, next).catch(next);
  });
  app.get("/Marti/api/version/config", wrap(versionConfig));
  app.get("/Marti/api/clientEndPoints", (_request, response) => {
    response.json({ version: "3", type: "com.bbn.marti.remote.ClientEndpoint", data: [], nodeId: NODE_ID });
  });
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
