
FROM alpine:latest as base
RUN apk add nodejs npm git ffmpeg
RUN npm i -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/common/package.json ./packages/common/package.json
COPY packages/server/package.json ./packages/server/package.json
COPY packages/client-web/package.json ./packages/client-web/package.json

FROM base as deps
RUN --mount=type=cache,target=/root/.pnpm-store pnpm i

FROM deps as pkg-server
COPY packages/common ./packages/common
COPY packages/server ./packages/server
RUN pnpm build:server

FROM deps as pkg-client-web
COPY packages/common ./packages/common
COPY packages/client-web ./packages/client-web
RUN pnpm build:client-web

FROM base
COPY --from=pkg-server /app/packages/server/dist ./packages/server/dist
COPY --from=pkg-client-web /app/packages/client-web/dist ./packages/client-web/dist
ENV NODE_ENV=production
CMD [ "pnpm", "start" ]