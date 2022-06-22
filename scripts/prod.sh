#!/bin/bash
if [[ -d /mnt/wsl ]]; then
	rm -rf ~/.docker
fi

cp .npmrc .npmrc2
cat ~/.npmrc >> .npmrc2

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export VITE_GIT_BRANCH=`git rev-parse --abbrev-ref HEAD`
export VITE_GIT_COMMIT_HASH=`git rev-parse --short HEAD`
export VITE_GIT_COMMIT_TIME=`git log -1 --format=%cI`
export VITE_GIT_COMMIT_MSG=`git show -s --format=%s`
docker-compose up -d --build
