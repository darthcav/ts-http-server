# @darthcav/ts-http-server

![Node][node-version] ![Version][version-image] ![CI][ci-badge] ![Coverage][coverage-badge]

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

## License

[Apache-2.0](LICENSE)

[node-version]: https://img.shields.io/badge/node-%3E%3D25-orange.svg?style=flat-square
[version-image]: https://img.shields.io/badge/version-0.1.0-blue.svg?style=flat-square
[ci-badge]: https://github.com/darthcav/ts-http-server/actions/workflows/tests.yml/badge.svg
[coverage-badge]: https://img.shields.io/badge/coverage-check%20CI-yellow.svg?style=flat-square
[pages-url]: https://darthcav.github.io/ts-http-server/
