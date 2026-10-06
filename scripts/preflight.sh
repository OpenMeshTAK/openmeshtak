#!/bin/sh
# Checks before `docker compose up` that every port this deployment publishes is free on the host.
# Run it next to docker-compose.yml; pass extra compose arguments such as -f if you use them:
#
#   sh preflight.sh
#
# The check runs in the OpenMeshTak image on the host network (Linux hosts), so the host needs no
# Node.js. Ports of this project's running containers count as free: that is an upgrade.
set -eu

image=$(docker compose "$@" config --images | grep '/openmeshtak:' | head -n 1)
if ! docker image inspect "$image" >/dev/null 2>&1; then
  docker pull "$image"
fi

COMPOSE_CONFIG=$(docker compose "$@" config --format json)
COMPOSE_PS=$(docker compose "$@" ps --format json 2>/dev/null || true)
DOCKER_PS=$(docker ps --format '{{.Names}}	{{.Ports}}')
export COMPOSE_CONFIG COMPOSE_PS DOCKER_PS

# Root inside the throwaway container may bind ports below 1024 such as 80 and 443.
exec docker run --rm --network host --user 0 --entrypoint node \
  -e COMPOSE_CONFIG -e COMPOSE_PS -e DOCKER_PS \
  "$image" dist/cli/preflight-ports.js
