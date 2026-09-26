import { createServer } from "node:https";
import type { Server } from "node:net";
import { config } from "../../shared/config/config.js";
import { logger } from "../../shared/logging/logger.js";
import { trustedCertificateAuthorities } from "./certificate-authority.js";
import { createEnrollmentApp } from "./enrollment-app.js";
import { createMartiApp } from "./marti/marti-app.js";
import { createStreamingServer } from "./streaming/streaming-server.js";
import { currentServerCertificate, decryptServerKey } from "./server-certificate.js";
import { loadTakServerSettings } from "./tak-server-settings.js";

/**
 * Runs the TAK server listeners next to the HTTP API. They terminate TLS themselves with the TAK
 * server certificate, so they are exposed directly instead of through the reverse proxy. Settings
 * changes restart them; a failing listener never takes the API down.
 */
class TakListeners {
  private servers: Server[] = [];
  private restarting: Promise<void> = Promise.resolve();
  /** Only the Core server process runs listeners; tests and scripts that change settings do not. */
  private running = false;

  start(): Promise<void> {
    this.running = true;
    return this.restart();
  }

  /** Applies changed settings or certificates if the listeners run in this process. */
  reload(): Promise<void> {
    return this.running ? this.restart() : Promise.resolve();
  }

  /** Serializes restarts so overlapping settings changes cannot leave duplicate listeners. */
  private restart(): Promise<void> {
    this.restarting = this.restarting.then(() => this.restartNow()).catch((error: unknown) => {
      logger.error({ error, event: "tak_server_start_failed" }, "TAK server failed to start");
    });
    return this.restarting;
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.closeAll();
  }

  private async closeAll(): Promise<void> {
    const servers = this.servers;
    this.servers = [];
    await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  }

  private async restartNow(): Promise<void> {
    await this.closeAll();
    const settings = await loadTakServerSettings();
    if (!settings.enabled || settings.hostName === null) {
      logger.info({ event: "tak_server_disabled" }, "TAK server is disabled");
      return;
    }
    const certificate = await currentServerCertificate(settings.hostName);
    const tls = { cert: certificate.certificateChainPem, key: decryptServerKey(certificate), minVersion: "TLSv1.2" as const };

    // Client certificates from every still trusted CA are accepted; Core then checks its records.
    const ca = (await trustedCertificateAuthorities()).map(({ certificatePem }) => certificatePem);

    this.servers.push(await listen(createServer(tls, createEnrollmentApp()), settings.enrollmentPort, "enrollment"));
    const mutualTls = { ...tls, ca, requestCert: true, rejectUnauthorized: true };
    this.servers.push(await listen(createServer(mutualTls, createMartiApp()), settings.martiPort, "marti"));
    this.servers.push(await listen(createStreamingServer({ ...tls, ca }), settings.streamingPort, "streaming"));
    logger.info(
      {
        event: "tak_server_started",
        hostName: settings.hostName,
        enrollmentPort: settings.enrollmentPort,
        martiPort: settings.martiPort,
        streamingPort: settings.streamingPort,
        certificateSource: certificate.source,
      },
      "TAK server started",
    );
  }
}

function listen(server: Server, port: number, name: string): Promise<Server> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, config.host, () => {
      server.off("error", reject);
      logger.info({ event: "tak_listener_started", listener: name, port }, "TAK listener started");
      resolve(server);
    });
  });
}

export const takListeners = new TakListeners();
