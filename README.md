# OpenMeshTak Core

OpenMeshTak Core is the authoritative API server for the OpenMeshTak ecosystem.

The repository is in early implementation. The current slice provides the Express/tsoa application shell, SQLite through pinned Prisma 7, centralized secret-safe Pino logging, a health endpoint, generated OpenAPI and local Swagger UI.

## Requirements

- Node.js 24 or newer
- pnpm 10.12 or newer

## Local development

```sh
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

The API listens on `http://127.0.0.1:3000` by default. Its initial endpoints are:

- `GET /api/v1/health`
- `GET /api/openapi.json`
- `GET /api/docs`

Run all current verification with:

```sh
pnpm check
```

The production clean-install path has a separate smoke test. It builds Core, applies every
migration to an empty temporary data directory, starts the production server and checks health,
initial setup and production-only route behavior:

```sh
pnpm smoke:clean-install
```

## Docker deployment

`deploy/compose.yaml` runs the published OpenMeshTak image from GitHub Container Registry (`ghcr.io/openmeshtak/openmeshtak`) behind Caddy. The image contains Core and the Web app; Core serves both on one origin. Each GitHub release includes `openmeshtak-deploy-<version>.tar.gz` with these deployment files, pinned to that release; no source checkout is needed.

1. Point DNS for your host name at the server and open ports 80, 443, 8446, 8443 and 8089.
2. `cp deploy/.env.example deploy/.env` and set `PUBLIC_HOST` and `BETTER_AUTH_SECRET`. `OPENMESHTAK_VERSION` selects the release.
3. Create the root encryption key once and back it up separately: `openssl rand -base64 32 > deploy/secrets/root_encryption_key`. Without it, stored secrets such as channel keys and the TAK CA key cannot be decrypted.
4. `docker compose -f deploy/compose.yaml --env-file deploy/.env up -d`
5. Open `https://<PUBLIC_HOST>` and complete setup with the bootstrap token from `docker compose -f deploy/compose.yaml logs core`.

To upgrade, set the new `OPENMESHTAK_VERSION`, then run `docker compose -f deploy/compose.yaml --env-file deploy/.env pull` and the `up -d` command again. Core applies database migrations on start.

To build the image from source instead, check out `openmeshtak-web` next to this repository and add the build override: `docker compose -f deploy/compose.yaml -f deploy/compose.build.yaml --env-file deploy/.env up -d --build`.

### Behind an existing reverse proxy (CloudPanel, nginx)

When another proxy already owns ports 80 and 443, add the override so Caddy serves plain HTTP on `127.0.0.1:8080` only:

`docker compose -f deploy/compose.yaml -f deploy/compose.reverse-proxy.yaml --env-file deploy/.env up -d`

In CloudPanel, create a reverse-proxy site for `PUBLIC_HOST` with the target `http://127.0.0.1:8080` and let CloudPanel issue its certificate. CloudPanel's own administration uses port 8443, so publish the TAK Data Package (Marti) port on an alternative such as 8484: change `"8443:8443"` to `"8484:8443"` in `deploy/compose.yaml` and enter 8484 as the Data Package port on the TAK server page, which is the only source for the ports in QR codes and profiles. ATAK learns it from the enrollment profile. Keep 8446 and 8089 unchanged and open 8446, 8484 and 8089 in the firewall; they go straight to Core because they terminate mutual TLS themselves. For a publicly trusted TAK certificate without port 80, use the DNS-01 (Cloudflare) option on the TAK server page.

### API documentation

Swagger UI is served at `https://<PUBLIC_HOST>/api/docs` when `SWAGGER_ENABLED=true` (off by default in production, on in development). The OpenAPI document is always available at `/api/openapi.json`.

Runtime data (SQLite database and stored files) lives in the `core-data` volume at `/server/data`.

## Releases

One image contains Core and the Web app, and both repositories share one version. To release, set the same `version` in `package.json` of both repositories, commit, push the tag `v<version>` (for example `v0.2.0`) to `openmeshtak-web` first and then to this repository. The release workflow here verifies both repositories at that tag, checks that both `package.json` versions match it, publishes the multi-arch image (`linux/amd64`, `linux/arm64`) to `ghcr.io/openmeshtak/openmeshtak` and creates the GitHub release with the deployment bundle, the OpenAPI document, third-party notices and SBOMs. While `openmeshtak-web` is private, the repository secret `WEB_REPOSITORY_TOKEN` must hold a fine-grained token with read access to its contents; once it is public, no secret is needed. Image tags are the exact version and `MAJOR.MINOR`; stable releases also move `latest`, pre-releases such as `v0.2.0-rc.1` do not.

## Known advisories

- `node-forge` GHSA-86w9-cpqp-85rv (RSA PKCS#1 v1.5 signature verification): Core uses node-forge only to write the PKCS#12 truststore of TAK connection packages and never verifies signatures with it, so the vulnerable code path is not reachable. The advisory is ignored in `pnpm audit` with this justification and reviewed again when a patched version exists.

## License

OpenMeshTak Core is licensed under `AGPL-3.0-only`.
