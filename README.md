# @darthcav/ts-http-server

[![Node][node-version]][node-url] ![Version][version-image] ![CI][ci-badge] [![Coverage][coverage-badge]][coverage-url]

A TypeScript wrapper HTTP server for Node.js >= 25 based upon [Fastify](https://fastify.dev/).

[API Documentation][pages-url]

## Features

- Native TypeScript execution (Node.js type stripping, no transpiler needed at runtime)
- Strict TypeScript configuration with isolated declarations
- Content negotiation for error responses (HTML / JSON / plain-text)
- Access logging via `onResponse` hook — `info` for 2xx/3xx, `error` for 4xx/5xx
- Default plugin set: CORS, compression, ETag, Helmet CSP, EJS views, and static files
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

main(pkg.name, logger, false, () => {
    const locals = { pkg }
    const plugins = defaultPlugins({ locals })
    const routes = defaultRoutes()

    const fastify = launcher({ logger, locals, plugins, routes })

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.on(signal, async (signal) =>
            fastify
                .close()
                .then(() => {
                    logger.error(`Server closed on ${signal}`)
                    process.exit(0)
                })
                .catch((error) => {
                    logger.error(`Shutdown error: ${error}`)
                    process.exit(1)
                }),
        )
    }
})
```

The `defaultPlugins` function accepts an optional `baseDir` to resolve the `src/` folder
(defaults to the parent of `import.meta.dirname`):

```ts
const plugins = defaultPlugins({ locals, baseDir: import.meta.dirname })
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

```
src/
  index.ts          # Library entry point
  start.ts          # Application entry point
  launcher.ts       # Application launcher (returns FastifyInstance)
  types.ts          # Shared type definitions
  defaults/         # Default Fastify options, plugins, routes, and error handler
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

| Argument               | Default         | Description                                   |
|------------------------|-----------------|-----------------------------------------------|
| `BUILD_IMAGE`          | `node:25-alpine`| Base image for both stages                    |
| `APP_USER`             | `node`          | OS user owning `/app` and running the process |
| `APP_GROUP`            | `node`          | OS group owning `/app`                        |
| `CONTAINER_EXPOSE_PORT`| `8888`          | Port exposed by the container                 |

```shell
docker build \
  --build-arg APP_USER=1001 \
  --build-arg APP_GROUP=1001 \
  --build-arg CONTAINER_EXPOSE_PORT=9000 \
  -t ts-http-server .
```

### Run

```shell
docker run --rm -p 8888:8888 ts-http-server
```

### Docker Compose

```yaml
services:
  app:
    image: ts-http-server
    ports:
      - "8888:8888"
    environment:
      NODE_ENV: production
    # Override the running user at runtime (must match a valid UID:GID on the host if needed)
    user: "1001:1001"
```

> **Note:** `APP_USER`/`APP_GROUP` are baked in at build time via `chown` and `USER`.
> To override the running user at runtime use the `user:` key in docker-compose,
> **not** the `environment:` block.

## License

[Apache-2.0](LICENSE)

[node-version]: https://img.shields.io/badge/node-%3E%3D25-orange.svg?style=flat-square
[node-url]: https://nodejs.org
[version-image]: https://img.shields.io/badge/version-0.3.3-blue.svg?style=flat-square
[ci-badge]: https://github.com/darthcav/ts-http-server/actions/workflows/tests.yml/badge.svg
[coverage-badge]: https://codecov.io/github/darthcav/ts-http-server/branch/dev/graph/badge.svg?token=K8Q4T4N9SG
[coverage-url]: https://codecov.io/github/darthcav/ts-http-server
[pages-url]: https://darthcav.github.io/ts-http-server/
