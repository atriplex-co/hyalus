
FROM alpine:latest as base
RUN apk add nodejs yarn git ffmpeg
WORKDIR /app
COPY package.json yarn.lock .npmrc ./
COPY packages/common/package.json ./packages/common/package.json
COPY packages/server/package.json ./packages/server/package.json
COPY packages/client-web/package.json ./packages/client-web/package.json

FROM base as deps
ARG GH_TOKEN
RUN echo "//npm.pkg.github.com/:_authToken=${GH_TOKEN}" >> .npmrc
RUN --mount=type=cache,target=/usr/local/share/.cache yarn --frozen-lockfile

FROM deps as build
COPY packages/common ./packages/common
COPY packages/server ./packages/server
COPY packages/client-web ./packages/client-web
RUN yarn build:server
RUN yarn build:client-web

FROM base
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/client-web/dist ./packages/client-web/dist
ENV NODE_ENV=production
CMD [ "yarn", "start" ]