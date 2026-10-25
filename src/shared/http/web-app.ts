import { extname, join, resolve } from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";

/**
 * The Web app loads its scripts, workers and data from its own origin only. Base-map tiles come
 * from the administrator's tile servers, which map settings restrict to HTTPS or local HTTP, and
 * offline tiles and symbols are blob and data images. Vuetify writes its theme into a style
 * element and positions overlays with inline styles, so styles must allow inline values.
 */
export const WEB_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:*",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

function isApiPath(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

/**
 * Serves the built Web app from the same origin as the API, so one image runs both. Hashed build
 * assets are cached forever; everything else, including index.html and the service worker, is
 * revalidated so a new release reaches installed PWAs. Unknown page paths fall back to index.html
 * for client-side routing; unknown API paths and missing files keep the JSON 404.
 */
export function mountWebApp(app: Express, webRootPath: string): void {
  const webRoot = resolve(webRootPath);
  app.use((request: Request, response: Response, next: NextFunction) => {
    // Unknown API paths keep the stricter API policy on their JSON 404.
    if (!isApiPath(request.path)) {
      response.setHeader("Content-Security-Policy", WEB_CONTENT_SECURITY_POLICY);
    }
    next();
  });
  app.use(
    express.static(webRoot, {
      index: false,
      setHeaders: (response, path) => {
        const isHashedAsset = path.startsWith(join(webRoot, "assets"));
        response.setHeader("Cache-Control", isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache");
      },
    }),
  );
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isPageRequest = request.method === "GET" || request.method === "HEAD";
    if (!isPageRequest || isApiPath(request.path) || extname(request.path) !== "") {
      next();
      return;
    }
    response.setHeader("Cache-Control", "no-cache");
    response.sendFile(join(webRoot, "index.html"));
  });
}
