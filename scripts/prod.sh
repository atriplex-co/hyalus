#!/bin/bash
if [[ -d /mnt/wsl ]]; then
	rm -rf ~/.docker
fi

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker-compose up -d --build
