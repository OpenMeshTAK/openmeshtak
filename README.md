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

## License

OpenMeshTak Core is licensed under `AGPL-3.0-only`.
