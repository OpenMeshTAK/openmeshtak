import { readFileSync } from "node:fs";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { mountAuthRoutes } from "./modules/auth/auth.routes.js";
import { createApiKeyFailureRateLimit } from "./modules/api-clients/api-key-rate-limit.js";
import { announceEventChanges } from "./modules/events/event-changes.js";
import { acmeHttpChallengeResponse } from "./modules/tak-server/http-challenge.js";
import { RegisterRoutes } from "./generated/routes.js";
import { config } from "./shared/config/config.js";
import { errorHandler, notFoundHandler } from "./shared/errors/problem.js";
import { apiResponseHeaders, rejectCrossSiteRequests } from "./shared/http/browser-security.js";
import { trustProxySetting } from "./shared/http/trust-proxy.js";
import { mountWebApp } from "./shared/http/web-app.js";
import { requestLogging } from "./shared/logging/request-logging.js";

function loadOpenApiDocument(): Record<string, unknown> {
  const openApiPath = new URL("../openapi/openapi.json", import.meta.url);
  return JSON.parse(readFileSync(openApiPath, "utf8")) as Record<string, unknown>;
}

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", trustProxySetting(config.trustProxy));
  // The Web app is never framed; API responses add their own strict CSP.
  app.use(helmet({ contentSecurityPolicy: false, frameguard: { action: "deny" } }));
  app.use(requestLogging);
  // Let's Encrypt fetches HTTP-01 challenges here through the reverse proxy of the Web address.
  app.get("/.well-known/acme-challenge/:token", (request, response, next) => {
    const keyAuthorization = acmeHttpChallengeResponse(request.params.token);
    if (keyAuthorization === undefined) {
      next();
      return;
    }
    response.type("text/plain").send(keyAuthorization);
  });
  // Swagger UI under /api/docs keeps Helmet's defaults; it needs scripts and styles.
  app.use(["/api/v1", "/api/auth"], apiResponseHeaders);
  mountAuthRoutes(app);
  app.use(express.json({ limit: "1mb", type: ["application/json", "application/*+json"] }));

  app.use("/api/v1", rejectCrossSiteRequests);
  app.use("/api/v1", createApiKeyFailureRateLimit());
  app.use("/api/v1/events", announceEventChanges);
  RegisterRoutes(app);

  app.get("/api/openapi.json", (_request, response) => {
    response.json(loadOpenApiDocument());
  });

  if (config.apiDocsEnabled) {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(loadOpenApiDocument()));
  }

  if (config.webRoot !== undefined) {
    mountWebApp(app, config.webRoot);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
