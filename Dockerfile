##### Build Arguments #####
ARG BUILD_IMAGE=node:25-alpine

##### Install dependencies #####
FROM ${BUILD_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json README.md LICENSE .env.example ./
COPY src ./src/
RUN npm ci --no-audit --no-fund

##### Runtime #####
FROM ${BUILD_IMAGE}
ARG APP_USER=node
ARG APP_GROUP=node
ARG CONTAINER_EXPOSE_PORT=8888
ENV CONTAINER_EXPOSE_PORT=${CONTAINER_EXPOSE_PORT}
WORKDIR /home/${APP_USER}/app
COPY --from=build /app/ ./
RUN chown -R ${APP_USER}:${APP_GROUP} /home/${APP_USER}/app
USER ${APP_USER}
EXPOSE ${CONTAINER_EXPOSE_PORT}
ENTRYPOINT [ "node", "src/start.ts" ]
