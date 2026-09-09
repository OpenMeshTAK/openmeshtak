import { createApp } from "./app.js";
import { rotateBootstrapChallenge } from "./modules/setup/bootstrap.service.js";
import { config } from "./shared/config/config.js";
import { connectDatabase, disconnectDatabase } from "./shared/database/database.js";
import { logger } from "./shared/logging/logger.js";
import { writeBootstrapOperatorNotice } from "./shared/logging/operator-output.js";

async function startServer(): Promise<void> {
  await connectDatabase();

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

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ event: "server_shutdown_started", signal }, "Server shutdown started");

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
