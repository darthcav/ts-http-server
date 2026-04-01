# Copilot Instructions

## Build, test, and lint

- Use Node.js 25+; this project relies on native TypeScript execution and ESM.
- If `.env.local` is missing, create it from `.env.example` before running tests or `npm start`.
- Install dependencies with `npm install` for local work or `npm ci` in CI-like validation.
- `npm start` runs `node --env-file=.env.local src/start.ts` directly from source, not from `dist/`.
- Build the package with `npm run build`.
- Type-check without emitting with `npm run typecheck`.
- Run the full test suite with `npm test`.
- Run coverage with `npm run test:coverage` or `npm run test:coverage:lcov`.
- Run one test file:

    ```shell
    node --env-file=.env.local --test --test-reporter=spec \
      src/__tests__/defaultRoutes.test.ts
    ```

- Run one named test:

    ```shell
    node --env-file=.env.local --test --test-reporter=spec \
      --test-name-pattern="GET / → 200 text/html" \
      src/__tests__/defaultRoutes.test.ts
    ```

- Lint with `npm run lint`; auto-fix with `npm run lint:fix`.
- `npm run lint` uses Biome for code/config files and Prettier only for Markdown files.
- Generate API docs with `npm run doc`.
- CI in `.github/workflows/tests.yml` runs separate `lint`, `test`, and `coverage` jobs on Node 25, and the test jobs
  build first and copy `.env.example` to `.env.local`.

## High-level architecture

- `src/index.ts` is the published library entrypoint. It re-exports the launcher, default Fastify wiring, hooks, and
  shared types.
- `src/start.ts` is the runnable app entrypoint used by `npm start`. It creates the LogTape logger, builds `locals`,
  gets the default plugin and route maps, starts the server with `launcher()`, and installs `SIGINT` / `SIGTERM`
  shutdown handlers.
- `src/launcher.ts` is the composition root. It:
    - creates the Fastify instance by merging `defaultFastifyOptions(logger)` with caller overrides,
    - decorates `fastify.locals` and `fastify.verifyToken` plus any extra decorators,
    - conditionally registers a global `preHandler` auth hook via `createAuthPreHandler(locals.authPaths)` when
      `authPaths` is non-empty,
    - registers plugins and routes from `Map` objects,
    - installs the default 404 handler and `defaultErrorHandler`,
    - adds the shared `preHandler` and `onResponse` hooks,
    - starts listening and returns the `FastifyInstance`.
- `src/defaults/defaultFastifyOptions.ts` disables Fastify's built-in request logging, enables `trustProxy`, generates
  request IDs with `crypto.randomUUID()`, and routes Fastify logging through LogTape.
- `src/defaults/defaultPlugins.ts` defines the default plugin stack: `@fastify/accepts`, `compress`, `cors`, `etag`,
  `helmet`, `view`, `static`, `swagger`, and `swagger-ui`. It also loads `src/openapi/api.yaml`, inlines schema files
  from `src/openapi/schemas/`, serves Swagger UI at `/docs`, wires EJS templates from `src/views`, serves static assets
  from `src/public`, and injects an OpenID Connect security scheme into the OpenAPI document only when optional
  `keycloakAuth` config is provided.
- `src/auth/keycloak.ts` exports `createKeycloakVerifier(config)`, a factory that returns a `TokenVerifier` backed by
  the Keycloak realm's JWKS endpoint. Keys are fetched lazily and cached via `jose`; token verification checks the
  signature, expiry, and issuer claims.
- `src/defaults/defaultRoutes.ts` defines the default home route behavior. `GET /` renders `index.ejs` only for HTML
  requests; other methods on `/` return `405`, and non-HTML `GET /` requests become `406`.
- `src/defaults/defaultRoutes.ts` also defines the default API index at `GET /api/`, which only serves JSON, exposes a
  `HEAD` route, and returns `405` for unsupported mutating methods. Routes carry no per-route auth logic; authentication
  is enforced globally by the `preHandler` hook registered in `launcher()` when `locals.authPaths` is set.
- `src/hooks/authPreHandler.ts` exports `createAuthPreHandler(authPaths, realm)`, a factory that compiles the given
  picomatch glob patterns and returns a Fastify `preHandler` hook. For each request, `request.routeOptions.url` is
  tested against the compiled matcher; non-matching routes pass through unconditionally. Matching routes delegate token
  verification to the `verifyToken` Fastify decorator; on failure the `WWW-Authenticate: Bearer realm="<realm>"`
  challenge header is set using the `realm` parameter (defaults to `"api"`).
- `src/defaults/defaultErrorHandler.ts` is responsible for content negotiation on errors. It renders `_error.ejs` for
  HTML, returns JSON for API clients, and falls back to plain text otherwise.
- `src/hooks/preHandler.ts` and `src/hooks/onResponse.ts` provide the request/access logging strategy. Fastify's
  built-in request logging is disabled in `defaultFastifyOptions`, so these hooks are the main logging path.
- The package exports only `"."` from `dist/`; there is no CLI or secondary package entrypoint to keep in sync.
- There are two different `public` concepts in this repo:
    - `src/public/` contains runtime static assets served by `@fastify/static`.
    - root `public/` is generated output from `npm run doc` for GitHub Pages / TypeDoc.

## Key conventions

- Keep the project ESM-only and use `.ts` extensions in imports.
- Stick to erasable TypeScript syntax only; the project assumes Node's native TypeScript execution rather than a runtime
  transpiler.
- Exported functions and exported types use JSDoc, and exported functions should keep explicit return types.
- Follow the map-based extension pattern:
    - plugins are `Map<string, FSTPlugin>`
    - routes are `Map<string, RouteOptions>`
    - optional decorators are `Map<string, unknown>`
    - `launcher()` iterates map values directly, so insertion order matters when adding defaults.
- `defaultPlugins({ locals, baseDir })` uses `locals.pkg` as the default EJS view context. Preserve that behavior when
  changing template rendering.
- `defaultPlugins()` resolves `src/views`, `src/public`, and `src/openapi` from `baseDir` when supplied; otherwise it
  resolves relative to the package source. Keep that in mind when changing path logic or tests.
- `defaultPlugins()` currently parses `src/openapi/api.yaml` and inlines component schemas from `src/openapi/schemas/`.
  Keep the OpenAPI document, referenced schema files, runtime route behavior, and tests aligned.
- `defaultPlugins()` accepts optional `keycloakAuth` config to inject the OpenID Connect security scheme into the
  OpenAPI document. `launcher()` accepts an optional `verifyToken` function registered as a Fastify decorator, and
  conditionally registers the auth `preHandler` hook when `locals.authPaths` is non-empty, passing `locals.authRealm` as
  the `WWW-Authenticate` realm label. Keep these aligned so the generated OpenAPI document describes the same auth
  behavior the runtime enforces.
- Error handling depends on the accepts/view plugins being available. If you customize plugin registration, make sure
  content negotiation and HTML error rendering still work.
- Tests live under `src/__tests__/` and use Node's built-in `node:test` runner with `suite()` and `test()`, not
  Jest/Vitest-style APIs.
- Existing HTTP tests start real servers on fixed ports (`19001`-`19005`) and wait briefly before requests instead of
  using `fastify.inject()`. The Keycloak unit test uses a mock JWKS server on port `19010`. The auth pre-handler is
  tested via the `defaultRoutes` HTTP suite on port `19004` using `authPaths: ["/api/**"]`. Match that style unless
  there is a strong reason to change it.
- `launcher()` starts listening before returning, but the returned `FastifyInstance` is handed back before the listen
  callback fires. When writing integration tests, continue waiting for readiness before issuing requests.
- Avoid introducing assumptions that tests can bind random shared ports or run the current fixed-port suites in parallel
  without further changes.
- Keep Markdown formatting compatible with Prettier; do not expect Biome alone to validate `*.md`.

## Editing guidance

- Preserve the map-based composition model in `launcher()`: plugin registration order and route insertion order are both
  meaningful.
- Keep the project ESM-only and prefer `.ts` import specifiers everywhere inside `src/`.
- When touching exported APIs, keep explicit return types and JSDoc so TypeDoc output remains complete.
- Prefer narrow, typed changes over broad casts. In particular, avoid adding new `as unknown as ...` assertions unless
  there is no practical alternative.
- If you change route behavior, update all affected surfaces together: route handlers, OpenAPI spec, tests, and any
  README or docs examples that describe the route.
- If you change logging behavior, preserve request correlation through Fastify's request/reply loggers and keep fallback
  handling for missing headers such as `referer` and `user-agent`.
- If you change startup or shutdown behavior, keep graceful `SIGINT` / `SIGTERM` handling intact and avoid introducing
  silent failures during `listen()` or `close()`.
- If you change `defaultPlugins()`, be careful not to confuse runtime assets in `src/public/` with generated docs in
  root `public/`.
- If you touch Swagger UI config, keep the browser-only callback boundary explicit and avoid spreading DOM assumptions
  into server-side code.
- When touching startup behavior, remember that `npm start` executes `src/start.ts` directly under Node's native TS
  support, so source-level runtime compatibility matters.

## Current recommendations

- `src/start.ts` currently uses `Number(env["CONTAINER_EXPOSE_PORT"]) || 8888`. If startup configuration is touched,
  prefer explicit finite-number validation rather than relying on falsy coercion.
- `src/defaultErrorHandler.ts` currently treats Boom detection with a double assertion (`as unknown as Boom`). If that
  file is modified, prefer introducing a small type guard rather than extending the assertion pattern.
- `src/openapi/api.yaml` is the public baseline document. `defaultPlugins()` mutates the parsed document in memory to
  inject an OpenID Connect security scheme only when `keycloakAuth` is provided, so avoid changing runtime auth behavior
  in just one place.
- `src/defaults/defaultPlugins.ts` currently inlines only top-level schema refs synchronously from
  `src/openapi/schemas/`. If OpenAPI complexity grows, prefer a more robust ref-resolution strategy instead of
  duplicating manual ref loading.
- `src/defaults/defaultPlugins.ts` includes a browser-only Swagger UI callback with a `@ts-expect-error`. If you touch
  that config, keep the browser/runtime boundary explicit and avoid spreading DOM assumptions into server-side code.
- `README.md` can drift from the real startup flow and plugin stack. If you touch startup, default plugins, or API
  behavior, verify that the README usage example, feature list, and route documentation still match the current
  implementation.
