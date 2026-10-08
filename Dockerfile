# syntax=docker/dockerfile:1
# OpenMeshTak: Core serves the API and the built Web app on port 3000 behind the reverse proxy, plus
# the TAK server ports it exposes itself.
#
# The Web app comes from the openmeshtak-web repository through the named build context "web":
#   docker build --build-context web=../openmeshtak-web .

# The Web build output is plain static files, so it is built once on the build platform.
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS web-build
RUN corepack enable
WORKDIR /web
COPY --from=web package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY --from=web . .
RUN pnpm build
# Third-party notices and the CycloneDX SBOM of the Web app, served next to it.
RUN pnpm release:notices

FROM node:24-bookworm-slim AS build
# better-sqlite3 falls back to compiling its native module when no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
# Only production dependencies ship; the Prisma CLI and tsx are among them because migrations run
# on every start.
RUN pnpm prune --prod
# Third-party notices and the CycloneDX SBOM for exactly the packages this image ships.
RUN pnpm release:notices

FROM node:24-bookworm-slim
LABEL org.opencontainers.image.title="OpenMeshTak" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.source="https://github.com/OpenMeshTAK/openmeshtak"
# Prisma picks its schema engine by the OpenSSL version it detects. The build stage has libssl3
# (through python3), so the engine installed there is the openssl-3.0.x one; without OpenSSL here
# Prisma falls back to openssl-1.1.x and tries to download that engine on every start.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT=3000 \
    DATA_DIRECTORY=/server/data \
    DATABASE_URL=file:/server/data/db/openmeshtak.sqlite \
    ROOT_ENCRYPTION_KEY_FILE=/run/secrets/root_encryption_key \
    TAK_CERTIFICATE_DIRECTORY=/server/certs \
    TRUST_PROXY=true \
    WEB_ROOT=/app/web
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json /app/prisma7.config.ts /app/LICENSE ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/openapi ./openapi
COPY --from=build --chown=node:node /app/firmware-profiles ./firmware-profiles
COPY --from=build --chown=node:node /app/assets ./assets
COPY --from=web-build --chown=node:node /web/dist ./web
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh && mkdir -p /server/data && chown -R node:node /server/data
USER node
VOLUME ["/server/data"]
# 3000: Web app and HTTP API (reverse proxy only). 8446/8443/8089: TAK enrollment, Data Packages, CoT stream.
EXPOSE 3000 8446 8443 8089
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
