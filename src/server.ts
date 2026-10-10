import { createApp } from "./app.js";
import { rotateBootstrapChallenge } from "./modules/setup/bootstrap.service.js";
import { ensureAdministratorGrants } from "./modules/user-groups/system-groups.js";
import { backfillUsernames } from "./modules/users/usernames.js";
import { config } from "./shared/config/config.js";
import { getRootKey } from "./shared/crypto/root-key.js";
import { firmwareProfiles } from "./modules/meshtastic-firmware/firmware-profiles.js";
import { attachSessionStream } from "./modules/auth/session.realtime.js";
import { attachPackageChangeStream } from "./modules/data-packages/package-changes.realtime.js";
import { attachEventMemberStream } from "./modules/event-members/event-members.realtime.js";
import { attachProfileUpdateStream } from "./modules/profiles/profile-updates.realtime.js";
import { attachServerLogStream } from "./modules/server-logs/server-logs.realtime.js";
import { attachTakTrafficStream } from "./modules/tak-server/live-traffic.realtime.js";
import { attachMyTakCertificateStream } from "./modules/tak-server/my-tak-certificates.realtime.js";
import { attachTakServerStream } from "./modules/tak-server/tak-server.realtime.js";
import { metricHistory } from "./modules/system-status/system-metrics.js";
import { takListeners } from "./modules/tak-server/tak-listeners.js";
import { scheduleTrafficCleanup } from "./modules/tak-server/traffic-recording.js";
import { scheduleUnusedPackageCleanup } from "./modules/tak-server/unused-packages.js";
import { takAcmeManager } from "./modules/tak-server/acme-manager.js";
import { connectDatabase, disconnectDatabase } from "./shared/database/database.js";
import { logger } from "./shared/logging/logger.js";
import { createRealtimeServer } from "./shared/realtime/realtime-server.js";
import { writeBootstrapOperatorNotice } from "./shared/logging/operator-output.js";

// Record a crash before Node exits, so the stored warnings and errors show why Core stopped.
process.on("uncaughtExceptionMonitor", (error, origin) => {
  logger.fatal({ error, event: "process_crashed", origin }, "Core crashed");
});

async function startServer(): Promise<void> {
  // Fail at boot rather than on the first secret write when the root key is missing or invalid.
  getRootKey();
  // Invalid firmware profiles would make compatibility claims Core cannot keep.
  await firmwareProfiles();
  await connectDatabase();
  await ensureAdministratorGrants();
  await backfillUsernames();

  const bootstrapChallenge = await rotateBootstrapChallenge();
  if (bootstrapChallenge !== null) {
    writeBootstrapOperatorNotice(bootstrapChallenge);
  }

  // A TAK port that cannot be bound is a deployment error; never run a partial TAK server.
  await takListeners.start();

  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    logger.info(
      {
        event: "server_started",
        host: config.host,
        port: config.port,
        publicOrigin: config.publicOrigin,
      },
      "OpenMeshTak Core started",
    );
  });
  const realtime = createRealtimeServer(server);
  attachServerLogStream(realtime);
  attachTakTrafficStream(realtime);
  attachMyTakCertificateStream(realtime);
  attachPackageChangeStream(realtime);
  attachEventMemberStream(realtime);
  attachProfileUpdateStream(realtime);
  attachSessionStream(realtime);
  attachTakServerStream(realtime);

  scheduleTrafficCleanup();
  scheduleUnusedPackageCleanup();
  takAcmeManager.start();
  metricHistory.start();

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ event: "server_shutdown_started", signal }, "Server shutdown started");
    void takListeners.stop();
    takAcmeManager.stop();
    metricHistory.stop();

    // Closing Socket.IO disconnects open viewers and then closes the HTTP server itself.
    void realtime.close(() => {
      void disconnectDatabase()
        .then(() => {
          logger.info({ event: "server_stopped" }, "Server stopped");
        })
        .catch((error: unknown) => {
          logger.error({ error, event: "database_disconnect_failed" }, "Database disconnect failed");
          process.exitCode = 1;
        });
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  logger.fatal({ error, event: "server_start_failed" }, "OpenMeshTak Core failed to start");
  process.exitCode = 1;
});
