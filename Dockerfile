# syntax=docker/dockerfile:1
# OpenMeshTak Core: HTTP API behind the reverse proxy, plus the TAK server ports it exposes itself.

FROM node:24-bookworm-slim AS build
# better-sqlite3 falls back to compiling its native module when no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
# Third-party notices and the CycloneDX SBOM for exactly the packages this image ships.
RUN pnpm release:notices

FROM node:24-bookworm-slim
LABEL org.opencontainers.image.title="OpenMeshTak Core" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.source="https://github.com/OpenMeshTAK/openmeshtak"
ENV NODE_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT=3000 \
    DATA_DIRECTORY=/server/data \
    DATABASE_URL=file:/server/data/db/openmeshtak.sqlite \
    ROOT_ENCRYPTION_KEY_FILE=/run/secrets/root_encryption_key \
    TRUST_PROXY=true
WORKDIR /app
# The Prisma CLI and tsx stay installed: migrations run on every start, before the server.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json /app/prisma7.config.ts /app/LICENSE ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/openapi ./openapi
COPY --from=build --chown=node:node /app/firmware-profiles ./firmware-profiles
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh && mkdir -p /server/data && chown -R node:node /server/data
USER node
VOLUME ["/server/data"]
# 3000: HTTP API (reverse proxy only). 8446/8443/8089: TAK enrollment, Data Packages, CoT stream.
EXPOSE 3000 8446 8443 8089
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
