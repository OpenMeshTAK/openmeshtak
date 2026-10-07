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

The live server log under `Settings → Server log` uses Socket.IO at `/api/realtime`. Let the reverse proxy pass WebSocket upgrades (`Upgrade` and `Connection` headers) for `PUBLIC_HOST`; without them the log still works over HTTP long-polling, only less efficiently.

### TAK listen ports

Core listens on `TAK_ENROLLMENT_LISTEN_PORT`, `TAK_MARTI_LISTEN_PORT` and `TAK_STREAMING_LISTEN_PORT` (default 8446, 8443, 8089) inside the container. These are container values only; the public ports that devices receive come from the TAK server page. If one of the listen ports cannot be bound, Core does not start, so a TAK server never runs half.

### Public TAK ports

TAK apps expect the standard public ports. Keep them free on the TAK host name whenever possible:

| Port | Service | Used by |
| --- | --- | --- |
| `8446` | Certificate enrollment | ATAK QR code, connection package and Quick Connect |
| `8443` | Marti API (Data Packages) | ATAK and iTAK |
| `8089` | CoT streaming | ATAK and iTAK |

The Marti port can be changed on the TAK server page, for example to `8484` when a hosting panel such as CloudPanel already owns `8443`. ATAK learns the new port from its enrollment profile. **iTAK does not:** iTAK 2.12.3 ignores the port in its connection package and always requests Data Packages on `8443`. With another Marti port, iTAK still connects and exchanges CoT on `8089`, but it cannot list or download Data Packages from the server.

To serve iTAK when `8443` is taken on the host:

- **Dedicated address (recommended):** give the TAK host name its own public IPv4/IPv6 address and publish Core's ports only on that address, so `8443` there belongs to OpenMeshTak.
- **SNI passthrough:** a layer-4 router such as HAProxy in TCP mode or nginx `stream` with `ssl_preread` owns public `8443` and forwards connections for the TAK host name unchanged to Core and everything else to the other service. It must not terminate TLS, because Core checks the client certificate itself. This only works if the other service can be moved to a private port; CloudPanel documents no supported way to move its administration port.
- **Move the other service** off public `8443`, if it supports that. For CloudPanel, see below.

#### CloudPanel on the same host

CloudPanel serves its administration on public `8443` and offers no setting to change that. Its panel runs on its own nginx (`clp-nginx`), separate from the nginx for websites. If you already reach the panel through a CloudPanel custom domain on `443`, which proxies to `https://127.0.0.1:8443`, the panel only needs to listen on loopback:

1. Back up `/home/clp/services/nginx/sites-enabled/cloudpanel.conf`, then change its `listen 8443 ssl http2;` to `listen 127.0.0.1:8443 ssl http2;` and `listen [::]:8443 ssl http2;` to `listen [::1]:8443 ssl http2;`.
2. Check the file with `nginx -t -c /home/clp/services/nginx/nginx.conf`, then run `systemctl restart clp-nginx`. A reload is not enough: nginx keeps the old wildcard socket and the new loopback address cannot be bound.
3. Confirm with `ss -tlnp | grep 8443` that the panel listens only on `127.0.0.1` and `[::1]`, and that the panel domain still works.
4. Publish Core's Marti port on the public address only, for example `"203.0.113.10:8443:8443"`. A plain `"8443:8443"` binds `0.0.0.0` and collides with the panel on loopback. Add an IPv6 mapping only if the TAK host name has an AAAA record.
5. Set Marti to `8443` on the TAK server page. ATAK devices set up with the old port need to be set up again.

This edits a file CloudPanel generates, so a CloudPanel update can restore the public listener. Check `ss -tlnp | grep 8443` after updates; if CloudPanel holds `0.0.0.0:8443` again, Core cannot start and step 1 needs repeating.

Before relying on one of these setups, test enrollment, Data Package download and CoT with the ATAK and iTAK versions your participants use.

### API documentation

Swagger UI is served at `https://<PUBLIC_HOST>/api/docs` when `SWAGGER_ENABLED=true` (off by default in production, on in development). The OpenAPI document is always available at `/api/openapi.json`.

Runtime data (SQLite database and stored files) lives in the `core-data` volume at `/server/data`.

## Known advisories

- `node-forge` GHSA-86w9-cpqp-85rv (RSA PKCS#1 v1.5 signature verification): Core uses node-forge only to write the PKCS#12 truststore of TAK connection packages and never verifies signatures with it, so the vulnerable code path is not reachable. The advisory is ignored in `pnpm audit` with this justification and reviewed again when a patched version exists.

## AI assistance

LLMs are used in the development of this project. See [AI_USAGE.md](AI_USAGE.md) for how they are used and reviewed.

## License

OpenMeshTak Core is licensed under `AGPL-3.0-only`.
