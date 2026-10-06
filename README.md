# OpenMeshTak Core

OpenMeshTak Core is the authoritative API and backend for the OpenMeshTak ecosystem. It owns identity, authorization, events, memberships, mission content, provisioning, artifact generation, storage, integrations and the built-in TAK services.

OpenMeshTak is under active development. Client and firmware compatibility is published only after the corresponding real-client test has passed; the presence of a generator or protocol implementation is not by itself a compatibility claim.

## Capabilities

- versioned REST API with generated OpenAPI and optional Swagger UI
- local accounts, sessions, passkeys, participant claims and scoped API clients
- event, role, group, membership and permission management
- versioned event configuration and auditable publication workflows
- mission layers, CoT/KML conversion and ATAK Data Package generation
- TAK certificate enrollment, Marti package access and CoT streaming
- Meshtastic firmware profiles, channels and per-member configuration
- encrypted secret storage, structured redacted logging and audit events
- SQLite for the current implementation, with PostgreSQL planned for scaling

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

The API listens on `http://127.0.0.1:3000` by default. Useful development endpoints are:

- `GET /api/v1/health`
- `GET /api/openapi.json`
- `GET /api/docs`

Run the complete verification suite with:

```sh
pnpm check
```

The production clean-install smoke test builds Core, applies every migration to an empty temporary data directory, starts the production server, and checks health, initial setup and production-only route behavior:

```sh
pnpm smoke:clean-install
```

## Docker deployment

OpenMeshTak ships as one image, `ghcr.io/openmeshtak/openmeshtak`: Core serves the Web app, the API and the built-in TAK server. `docker-compose.yml` is a sample deployment behind an existing reverse proxy such as CloudPanel or nginx; its comments list the required `.env` values.

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

## Known advisories

- `node-forge` GHSA-86w9-cpqp-85rv (RSA PKCS#1 v1.5 signature verification): Core uses node-forge only to write the PKCS#12 truststore of TAK connection packages and never verifies signatures with it, so the vulnerable code path is not reachable. The advisory is ignored in `pnpm audit` with this justification and reviewed again when a patched version exists.

## License

OpenMeshTak Core is licensed under `AGPL-3.0-only`.
