import { createApp } from "./app.js";
import { rotateBootstrapChallenge } from "./modules/setup/bootstrap.service.js";
import { ensureAdministratorGrants } from "./modules/user-groups/system-groups.js";
import { config } from "./shared/config/config.js";
import { getRootKey } from "./shared/crypto/root-key.js";
import { firmwareProfiles } from "./modules/meshtastic-firmware/firmware-profiles.js";
import { takListeners } from "./modules/tak-server/tak-listeners.js";
import { takAcmeManager } from "./modules/tak-server/acme-manager.js";
import { connectDatabase, disconnectDatabase } from "./shared/database/database.js";
import { logger } from "./shared/logging/logger.js";
import { writeBootstrapOperatorNotice } from "./shared/logging/operator-output.js";

async function startServer(): Promise<void> {
  // Fail at boot rather than on the first secret write when the root key is missing or invalid.
  getRootKey();
  // Invalid firmware profiles would make compatibility claims Core cannot keep.
  await firmwareProfiles();
  await connectDatabase();
  await ensureAdministratorGrants();

  const bootstrapChallenge = await rotateBootstrapChallenge();
  if (bootstrapChallenge !== null) {
    writeBootstrapOperatorNotice(bootstrapChallenge);
  }

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

  void takListeners.start();
  takAcmeManager.start();

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ event: "server_shutdown_started", signal }, "Server shutdown started");
    void takListeners.stop();
    takAcmeManager.stop();

    server.close(() => {
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
