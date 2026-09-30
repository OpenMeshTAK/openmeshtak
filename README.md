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

## Docker deployment

`deploy/compose.yaml` runs Core and the Web app (`openmeshtak-web`, checked out next to this repository) behind Caddy:

1. Point DNS for your host name at the server and open ports 80, 443, 8446, 8443 and 8089.
2. `cp deploy/.env.example deploy/.env` and set `PUBLIC_HOST` and `BETTER_AUTH_SECRET`.
3. Create the root encryption key once and back it up separately: `openssl rand -base64 32 > deploy/secrets/root_encryption_key`. Without it, stored secrets such as channel keys and the TAK CA key cannot be decrypted.
4. `docker compose -f deploy/compose.yaml --env-file deploy/.env up -d --build`
5. Open `https://<PUBLIC_HOST>` and complete setup with the bootstrap token from `docker compose -f deploy/compose.yaml logs core`.

### Behind an existing reverse proxy (CloudPanel, nginx)

When another proxy already owns ports 80 and 443, add the override so the Web container serves plain HTTP on `127.0.0.1:8080` only:

`docker compose -f deploy/compose.yaml -f deploy/compose.reverse-proxy.yaml --env-file deploy/.env up -d --build`

In CloudPanel, create a reverse-proxy site for `PUBLIC_HOST` with the target `http://127.0.0.1:8080` and let CloudPanel issue its certificate. Open the TAK ports 8446, 8443 and 8089 in the firewall; they go straight to Core because they terminate mutual TLS themselves. For a publicly trusted TAK certificate without port 80, use the DNS-01 (Cloudflare) option on the TAK server page.

### API documentation

Swagger UI is served at `https://<PUBLIC_HOST>/api/docs` when `SWAGGER_ENABLED=true` (off by default in production, on in development). The OpenAPI document is always available at `/api/openapi.json`.

Runtime data (SQLite database and stored files) lives in the `core-data` volume at `/server/data`.

## License

OpenMeshTak Core is licensed under `AGPL-3.0-only`.
