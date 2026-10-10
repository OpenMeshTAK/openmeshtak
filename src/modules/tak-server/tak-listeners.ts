import { createServer } from "node:https";
import type { Server } from "node:net";
import { config } from "../../shared/config/config.js";
import { logger } from "../../shared/logging/logger.js";
import { trustedCertificateAuthorities } from "./certificate-authority.js";
import { createEnrollmentApp } from "./enrollment-app.js";
import { createMartiApp } from "./marti/marti-app.js";
import { createStreamingServer } from "./streaming/streaming-server.js";
import { currentServerCertificate, decryptServerKey } from "./server-certificate.js";
import type { TakServerSettings } from "../../generated/prisma/client.js";
import { loadTakServerSettings } from "./tak-server-settings.js";

/**
 * Runs the TAK server listeners next to the HTTP API. They terminate TLS themselves with the TAK
 * server certificate, so they are exposed directly instead of through the reverse proxy. They bind
 * the boot-configured listen ports; the public ports in the settings only appear in participant
 * material. Settings changes restart them. The listeners run all together or not at all: a
 * half-started TAK server (enrollment without Marti, say) would fail in confusing ways on devices.
 */
class TakListeners {
  private servers: Server[] = [];
  private restarting: Promise<void> = Promise.resolve();
  /** Only the Core server process runs listeners; tests and scripts that change settings do not. */
  private running = false;

  /**
   * Starts the listeners at boot. A port that cannot be bound is a deployment error, so it rejects
   * and Core stops; other problems, such as a missing certificate, are logged and fixed in the Web.
   */
  async start(): Promise<void> {
    this.running = true;
    this.restarting = this.restartNow().catch((error: unknown) => {
      if (isBindError(error)) {
        throw error;
      }
      logger.error({ error, event: "tak_server_start_failed" }, "TAK server failed to start");
    });
    await this.restarting;
  }

  /** Applies changed settings or certificates if the listeners run in this process. */
  reload(): Promise<void> {
    return this.running ? this.restart() : Promise.resolve();
  }

  /** Serializes restarts so overlapping settings changes cannot leave duplicate listeners. */
  private restart(): Promise<void> {
    this.restarting = this.restarting.catch(() => undefined).then(() => this.restartNow()).catch((error: unknown) => {
      logger.error({ error, event: "tak_server_start_failed" }, "TAK server failed to start");
    });
    return this.restarting;
  }

  /** Whether the listeners are bound in this process. */
  isListening(): boolean {
    return this.servers.length > 0;
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
    try {
      await this.listenAll(settings);
    } catch (error: unknown) {
      await this.closeAll();
      throw error;
    }
  }

  private async listenAll(settings: TakServerSettings): Promise<void> {
    if (settings.hostName === null) {
      return;
    }
    const ports = config.takListenPorts;
    const certificate = await currentServerCertificate(settings.hostName);
    const tls = { cert: certificate.certificateChainPem, key: decryptServerKey(certificate), minVersion: "TLSv1.2" as const };

    // Client certificates from every still trusted CA are accepted; Core then checks its records.
    const ca = (await trustedCertificateAuthorities()).map(({ certificatePem }) => certificatePem);

    // Enrollment accepts an optional client certificate, so enrolled apps can fetch their profile.
    const optionalClientTls = { ...tls, ca, requestCert: true, rejectUnauthorized: false };
    this.servers.push(await listen(createServer(optionalClientTls, createEnrollmentApp()), ports.enrollment, "enrollment"));
    const mutualTls = { ...tls, ca, requestCert: true, rejectUnauthorized: true };
    this.servers.push(await listen(createServer(mutualTls, createMartiApp()), ports.marti, "marti"));
    this.servers.push(await listen(createStreamingServer({ ...tls, ca }), ports.streaming, "streaming"));
    logger.info(
      {
        event: "tak_server_started",
        hostName: settings.hostName,
        listenPorts: ports,
        publicPorts: { enrollment: settings.enrollmentPort, marti: settings.martiPort, streaming: settings.streamingPort },
        certificateSource: certificate.source,
      },
      "TAK server started",
    );
  }
}

function isBindError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "EADDRINUSE" || code === "EACCES" || code === "EADDRNOTAVAIL";
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
