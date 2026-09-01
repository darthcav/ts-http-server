# @darthcav/ts-http-server

[![Node][node-version]][node-url] ![Version][version-image] ![CI][ci-badge]
[![Coverage][coverage-badge]][coverage-url]

A TypeScript wrapper HTTP server for Node.js >= 26 based upon [Fastify](https://fastify.dev/).

## Documentation

[API Documentation][pages-url]

## Features

- Native TypeScript execution (Node.js type stripping, no transpiler needed at runtime)
- Strict TypeScript configuration with isolated declarations
- Content negotiation for error responses (HTML / JSON / plain-text)
- Access logging via `onResponse` hook — `info` for 2xx/3xx, `error` for 4xx/5xx
- Default plugin set: accepts, CORS, compression, ETag, Helmet CSP, EJS views, static files,
  Swagger, and Swagger UI
- Optional Keycloak-backed JWT authentication for the default `/api/` routes
- Default `GET /health` endpoint reporting service status and runtime/environment information as
  `application/health+json` (IETF Health Check Response Format), with pluggable dependency checks
  that downgrade the status and return `503` on failure
- Returns a `FastifyInstance` for graceful shutdown via `SIGINT`/`SIGTERM`
- Biome for linting and formatting
- Built-in Node.js test runner
- TypeDoc for API documentation
- GitHub Actions CI/CD workflows

## Installation

```shell
npm install @darthcav/ts-http-server
```

## Usage

```ts
import { launcher, defaultPlugins, defaultRoutes } from "@darthcav/ts-http-server"
import { getConsoleLogger, main } from "@darthcav/ts-utils"
import process from "node:process"
import pkg from "./package.json" with { type: "json" }

const logger = await getConsoleLogger(pkg.name, "info")

main(pkg.name, logger, async () => {
    const locals = { pkg }
    const plugins = defaultPlugins({ locals })
    const routes = defaultRoutes()

    const fastify = launcher({ logger, locals, plugins, routes })

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, async (signal) =>
            fastify
                .close()
                .then(() => {
                    logger.error`Server closed on ${signal}`
                    process.exit(0)
                })
                .catch((error) => {
                    logger.error`Shutdown error: ${error}`
                    process.exit(1)
                }),
        )
    }
})
```

The `defaultPlugins` function accepts an optional `baseDir` to resolve the `src/` folder (defaults
to the parent of `import.meta.dirname`):

```ts
const plugins = defaultPlugins({ locals, baseDir: import.meta.dirname })
```

### CORS

Cross-origin requests are **disabled by default** (`@fastify/cors` is configured with
`origin: false`, i.e. same-origin only). To allow specific origins, pass a `cors` option — forwarded
to `@fastify/cors` — with an explicit allowlist:

```ts
const plugins = defaultPlugins({
    locals,
    cors: { origin: ["https://app.example.com"], credentials: true },
})
```

Avoid `origin: true` in production: it reflects any `Origin` header back, allowing every site to
make cross-origin requests.

Use `createMethodNotAllowedHandler` to answer the catch-all method route of a path with a
`405 Method Not Allowed` response whose `Allow` header lists the permitted methods:

```ts
import { createMethodNotAllowedHandler } from "@darthcav/ts-http-server"

routes.set("INDEX_405", {
    method: ["DELETE", "PATCH", "POST", "PUT", "OPTIONS"],
    url: "/",
    handler: createMethodNotAllowedHandler(["GET", "HEAD"]), // Allow: GET, HEAD
})
```

### Health checks

The default `GET /health` route returns an `application/health+json` report following the IETF
[Health Check Response Format for HTTP APIs][health-check-rfc]. By default it reports
`status: "pass"` together with service metadata (`version`, `serviceId`, …), process `uptime`, and
runtime `environment` and `memory` information.

To monitor dependencies, pass `healthChecks` to `defaultRoutes`. Each check is an object with a
`name` (conventionally `componentName:measurementName`) and a `run` function returning a
`HealthCheckResult`; checks run concurrently on every request and a check that throws is reported as
`fail`:

```ts
import { defaultRoutes, type HealthCheck } from "@darthcav/ts-http-server"

const healthChecks: HealthCheck[] = [
    {
        name: "database:responseTime",
        run: async () => {
            const start = performance.now()
            await db.query("SELECT 1")
            return {
                status: "pass",
                componentType: "datastore",
                observedValue: Math.round(performance.now() - start),
                observedUnit: "ms",
            }
        },
    },
    {
        name: "cache:availability",
        run: async () => ({ status: (await cache.ping()) ? "pass" : "warn" }),
    },
]

const routes = defaultRoutes({ healthChecks })
```

The results are grouped under the `checks` object keyed by `name`. The overall `status` is the worst
of all check statuses (`fail` > `warn` > `pass`). The endpoint responds with HTTP `200` for `pass`
and `warn`, and `503 Service Unavailable` for `fail`, so load balancers and orchestrators can probe
it directly. `/health` is never matched by `authPaths`' default `/api/**` glob, so it stays public.

[health-check-rfc]: https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06

### Keycloak authentication

To protect routes with Keycloak JWT authentication, set `API_AUTH_PATHS` to a comma-separated list
of [picomatch](https://github.com/micromatch/picomatch) glob patterns and provide the Keycloak
connection variables. The server verifies bearer tokens against the realm's JWKS endpoint; public
keys are cached and rotated automatically.

```ts
import { createKeycloakVerifier, type KeycloakAuthConfig } from "@darthcav/ts-http-server"

const keycloakAuth: KeycloakAuthConfig = {
    url: process.env["KEYCLOAK_URL"] ?? "",
    realm: process.env["KEYCLOAK_REALM"] ?? "",
    clientId: process.env["KEYCLOAK_CLIENT_ID"] ?? "",   // verified as the token audience
}

const verifyToken = createKeycloakVerifier(keycloakAuth)
const locals = {
    pkg,
    authPaths: ["/api/**"],
    authRealm: keycloakAuth.realm,   // used in WWW-Authenticate challenge
}
const plugins = defaultPlugins({ locals, keycloakAuth })   // marks /api/ as protected in OpenAPI
const routes = defaultRoutes()

const fastify = launcher({ logger, locals, plugins, routes, verifyToken })
```

When `locals.authPaths` is set, every request whose URL matches one of the glob patterns must carry
`Authorization: Bearer <token>`. Missing or invalid tokens receive `401 Unauthorized` with a
`WWW-Authenticate: Bearer realm="<authRealm>"` challenge (defaults to `"api"` when `authRealm` is
not set). When `authPaths` is `undefined` (the default), all routes are public regardless of any
token in the request.

You can supply any custom `verifyToken` function instead of `createKeycloakVerifier` — it receives
the raw `Authorization` header value and should return `true` to allow the request or `false` to
reject it with 401:

```ts
const verifyToken = async (authorizationHeader: string | undefined): Promise<boolean> => {
    return authorizationHeader === "Bearer my-static-token"
}
const fastify = launcher({ logger, locals, plugins, routes, verifyToken })
```

## Getting Started

```shell
# Install dependencies
npm install

# Run once
npm start

# Type-check
npm run typecheck

# Build (compile to JavaScript)
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run lint:fix

# Generate documentation
npm run doc
```

## Project Structure

```text
src/
  index.ts          # Library entry point
  start.ts          # Application entry point
  launcher.ts       # Application launcher (returns FastifyInstance)
  types.ts          # Shared type definitions
  auth/             # Authentication utilities
  defaults/         # Default Fastify options, plugins, routes, and error handler
  handlers/         # Reusable route handlers (e.g. createMethodNotAllowedHandler)
  hooks/            # Fastify hooks (preHandler, onResponse)
  __tests__/        # Test files
dist/               # Compiled output (generated)
public/             # Documentation output (generated)
```

## Docker

### Build

```shell
docker build -t ts-http-server .
```

Available build arguments:

| Argument                | Default          | Description                                   |
| ----------------------- | ---------------- | --------------------------------------------- |
| `BUILD_IMAGE`           | `node:26-alpine` | Base image for both stages                    |
| `APP_USER`              | `node`           | OS user owning `/app` and running the process |
| `APP_GROUP`             | `node`           | OS group owning `/app`                        |
| `CONTAINER_EXPOSE_PORT` | `8888`           | Port exposed by the container                 |

```shell
docker build \
  --build-arg APP_USER=1001 \
  --build-arg APP_GROUP=1001 \
  --build-arg CONTAINER_EXPOSE_PORT=9000 \
  -t ts-http-server .
```

Runtime environment variables:

| Variable                | Default     | Description                                                           |
| ----------------------- | ----------- | --------------------------------------------------------------------- |
| `HOST`                  | `localhost` | Bind address (use `0.0.0.0` in containers)                            |
| `CONTAINER_EXPOSE_PORT` | `8888`      | Port the server listens on                                            |
| `TRUST_PROXY`           | `false`     | `true`/`false`, or a comma-separated IP/CIDR allowlist                |
| `ENABLE_DOCS`           | unset       | `true`/`false` to force Swagger UI (`/docs`) on/off; see note below   |
| `API_AUTH_PATHS`        | unset       | Comma-separated picomatch globs for protected routes (e.g. `/api/**`) |
| `KEYCLOAK_URL`          | unset       | Keycloak server base URL                                              |
| `KEYCLOAK_REALM`        | unset       | Keycloak realm name; also used as the `WWW-Authenticate` realm label  |
| `KEYCLOAK_CLIENT_ID`    | unset       | Client ID registered in the realm; verified as the token `aud` claim  |

Proxy trust is **disabled by default** so `X-Forwarded-For` (and therefore `request.ip`, used in
access logs) cannot be spoofed. Enable `TRUST_PROXY` only when the server runs behind a trusted
reverse proxy — set it to an explicit IP/CIDR allowlist rather than `true` where possible. Hop
counts are not accepted: a hop count cannot validate the immediate peer, so Fastify fails closed on
numeric `trustProxy` values; a numeric `TRUST_PROXY` is rejected with a warning and proxy trust
stays disabled.

Swagger UI (`/docs`) and the OpenAPI spec publish the full endpoint map and are reachable without
authentication, so they are **disabled by default when `NODE_ENV=production`** and enabled
otherwise. Set `ENABLE_DOCS=true` to force them on (e.g. for a protected staging environment) or
`ENABLE_DOCS=false` to force them off. When calling `defaultPlugins` directly, pass the equivalent
`docs` boolean.

### Run

```shell
docker run --rm -p 8888:8888 -e HOST=0.0.0.0 ts-http-server
```

### Docker Compose

```yaml
services:
  ts-http-server:
    image: ghcr.io/darthcav/ts-http-server:latest
    container_name: ts-http-server
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "8888:8888"
    logging:
      driver: local
    # Override the running user at runtime (must match APP_USER/APP_GROUP used at build time,
    # or a valid UID:GID on the host). Defaults to the image's built-in node:node.
    # user: "1001:1001"
```

> **Note:** `APP_USER`/`APP_GROUP` are baked in at build time via `chown` and `USER`. To override
> the running user at runtime use the `user:` key in docker-compose, **not** the `environment:`
> block.

## License

[Apache-2.0](LICENSE)

[node-version]: https://img.shields.io/badge/node-%3E%3D26-orange.svg?style=flat-square
[node-url]: https://nodejs.org
[version-image]: https://img.shields.io/badge/version-0.9.3-blue.svg?style=flat-square
[ci-badge]: https://github.com/darthcav/ts-http-server/actions/workflows/tests.yml/badge.svg
[coverage-badge]:
    https://codecov.io/github/darthcav/ts-http-server/branch/dev/graph/badge.svg?token=K8Q4T4N9SG
[coverage-url]: https://codecov.io/github/darthcav/ts-http-server
[pages-url]: https://darthcav.github.io/ts-http-server/
