#!/bin/bash
if [[ -d /wsl/wsl ]]; then
	rm -rf ~/.docker
fi

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker-compose -f docker-compose.dev.yml kill
docker-compose -f docker-compose.dev.yml down --remove-orphans
docker-compose -f docker-compose.dev.yml up -d --build --force-recreate --remove-orphans
docker-compose -f docker-compose.dev.yml logs -f --tail 100 web
