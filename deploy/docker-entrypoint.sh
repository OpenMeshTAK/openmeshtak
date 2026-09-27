#!/bin/sh
# Applies pending database migrations, then starts Core. A failed migration stops the container
# instead of serving an outdated schema.
set -eu
mkdir -p /server/data/db /server/data/storage
node --import tsx scripts/prepare-data.ts
node --import tsx scripts/run-prisma.ts migrate deploy
exec node dist/server.js
