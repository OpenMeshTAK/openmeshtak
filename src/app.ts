import { readFileSync } from "node:fs";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { mountAuthRoutes } from "./modules/auth/auth.routes.js";
import { createApiKeyFailureRateLimit } from "./modules/service-accounts/api-key-rate-limit.js";
import { RegisterRoutes } from "./generated/routes.js";
import { config } from "./shared/config/config.js";
import { errorHandler, notFoundHandler } from "./shared/errors/problem.js";
import { requestLogging } from "./shared/logging/request-logging.js";

function loadOpenApiDocument(): Record<string, unknown> {
  const openApiPath = new URL("../openapi/openapi.json", import.meta.url);
  return JSON.parse(readFileSync(openApiPath, "utf8")) as Record<string, unknown>;
}

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(requestLogging);
  mountAuthRoutes(app);
  app.use(express.json({ limit: "1mb", type: ["application/json", "application/*+json"] }));

  app.use("/api/v1", createApiKeyFailureRateLimit());
  RegisterRoutes(app);

  app.get("/api/openapi.json", (_request, response) => {
    response.json(loadOpenApiDocument());
  });

  if (config.apiDocsEnabled) {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(loadOpenApiDocument()));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
