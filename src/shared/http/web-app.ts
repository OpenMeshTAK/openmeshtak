import { extname, join, resolve } from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";

/**
 * Serves the built Web app from the same origin as the API, so one image runs both. Hashed build
 * assets are cached forever; everything else, including index.html and the service worker, is
 * revalidated so a new release reaches installed PWAs. Unknown page paths fall back to index.html
 * for client-side routing; unknown API paths and missing files keep the JSON 404.
 */
export function mountWebApp(app: Express, webRootPath: string): void {
  const webRoot = resolve(webRootPath);
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
    const isApiPath = request.path === "/api" || request.path.startsWith("/api/");
    if (!isPageRequest || isApiPath || extname(request.path) !== "") {
      next();
      return;
    }
    response.setHeader("Cache-Control", "no-cache");
    response.sendFile(join(webRoot, "index.html"));
  });
}
