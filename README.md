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

OpenMeshTak ships as one image, `ghcr.io/openmeshtak/openmeshtak`: Core serves the Web app, the API and the built-in TAK server. `docker-compose.yml` is a sample deployment behind an existing reverse proxy such as CloudPanel or nginx; its comments list the `.env` values. Each GitHub release attaches it with that release as the default version.

1. `openssl rand -base64 32 > root_encryption_key` once, and back the file up separately.
2. Create `.env` with `PUBLIC_HOST` and `BETTER_AUTH_SECRET`. `OPENMESHTAK_VERSION` defaults to `latest`; pin it to upgrade deliberately, because Core applies database migrations on start.
3. Check the host ports: `sh scripts/preflight.sh`
4. `docker compose up -d`, then point the reverse proxy for `PUBLIC_HOST` at `http://127.0.0.1:8080`.
5. Complete setup with the bootstrap token from `docker compose logs core`, then set up the TAK server page.
6. Check the deployment through the public names: `docker compose exec core node dist/cli/check-deployment.js`

To build the image from source, check out `openmeshtak-web` next to this repository:

`docker build --build-context web=../openmeshtak-web -t ghcr.io/openmeshtak/openmeshtak:dev .`

### TAK listen ports

Core listens on `TAK_ENROLLMENT_LISTEN_PORT`, `TAK_MARTI_LISTEN_PORT` and `TAK_STREAMING_LISTEN_PORT` (default 8446, 8443, 8089) inside the container. These are container values only; the public ports that devices receive come from the TAK server page. If one of the listen ports cannot be bound, Core does not start, so a TAK server never runs half.

### API documentation

Swagger UI is served at `https://<PUBLIC_HOST>/api/docs` when `SWAGGER_ENABLED=true` (off by default in production, on in development). The OpenAPI document is always available at `/api/openapi.json`.

Runtime data (SQLite database and stored files) lives in the `core-data` volume at `/server/data`.

## Releases

One image contains Core and the Web app, and both repositories share one version. To release, set the same `version` in `package.json` of both repositories, commit, push the tag `v<version>` (for example `v0.2.0`) to `openmeshtak-web` first and then to this repository. The release workflow here verifies both repositories at that tag, checks that both `package.json` versions match it, publishes the multi-arch image (`linux/amd64`, `linux/arm64`) to `ghcr.io/openmeshtak/openmeshtak` and creates the GitHub release with the deployment bundle, the OpenAPI document, third-party notices and SBOMs. While `openmeshtak-web` is private, the repository secret `WEB_REPOSITORY_TOKEN` must hold a fine-grained token with read access to its contents; once it is public, no secret is needed. Image tags are the exact version and `MAJOR.MINOR`; stable releases also move `latest`, pre-releases such as `v0.2.0-rc.1` do not.

## Known advisories

- `node-forge` GHSA-86w9-cpqp-85rv (RSA PKCS#1 v1.5 signature verification): Core uses node-forge only to write the PKCS#12 truststore of TAK connection packages and never verifies signatures with it, so the vulnerable code path is not reachable. The advisory is ignored in `pnpm audit` with this justification and reviewed again when a patched version exists.

## License

OpenMeshTak Core is licensed under `AGPL-3.0-only`.
