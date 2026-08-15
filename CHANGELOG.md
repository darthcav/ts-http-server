# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.2] - 2026-08-15

Maintenance release: `@fastify/static` security hardening, CI automation, and dependency updates; no
functional changes to the public API.

### Security

- The `@fastify/static` copy nested under `@fastify/swagger-ui` no longer resolves to the vulnerable
  9.x line, which received no patch for
  [GHSA-8pvw-jcv7-9cmj](https://github.com/advisories/GHSA-8pvw-jcv7-9cmj) (authorization bypass via
  non-canonical URL paths) or
  [GHSA-83w8-p2f5-377r](https://github.com/advisories/GHSA-83w8-p2f5-377r) (route guard bypass via
  path traversal). `@fastify/swagger-ui` 6.1.1 moved its requirement from `^9.1.2` to `^10.1.0`, so
  the whole tree now dedupes to a single patched `@fastify/static` 10.1.3 and `npm audit` is clean
  again. No `overrides` entry is needed in `package.json`

### Tests

- `src/__tests__/swaggerUi.test.ts`: new suite covering the `/docs` static assets, the OpenAPI JSON
  document, and path-traversal rejection (plain and percent-encoded), guarding the `@fastify/static`
  resolution behind the Swagger UI routes

### CI

- `.github/workflows/sync-dev.yml`: new workflow that runs on every push to `main` and opens (and
  immediately merges) a `main` → `dev` pull request, so `dev` no longer drifts behind after a
  release. Requires the repository setting "Allow GitHub Actions to create and approve pull
  requests" (Settings → Actions → General), which is now enabled
- `.github/dependabot.yml`: npm and GitHub Actions update schedules changed from `weekly` to
  `monthly`

### Documentation

- `CLAUDE.md`: CI/CD section documents `sync-dev.yml` (including the required repository setting)
  and the monthly Dependabot schedule
- `README.md`: version badge updated to 0.9.2

### Dependencies

- `@darthcav/ts-utils` 0.10.8 → 0.10.10
- `@fastify/compress` 9.1.0 → 9.2.0
- `@fastify/static` 10.1.0 → 10.1.3
- `@fastify/swagger-ui` 6.1.0 → 6.1.1
- `@logtape/fastify` 2.2.4 → 2.3.1
- `@logtape/logtape` 2.2.4 → 2.3.1
- `fastify` 5.10.0 → 5.12.0
- `jose` 6.2.3 → 6.2.8
- `@biomejs/biome` 2.5.4 → 2.5.8
- `@types/node` 26.1.1 → 26.2.0
- `prettier` 3.9.5 → 3.9.6
- `@fastify/accept-negotiator` 2.0.1 → 2.1.0 (transitive)
- `@fastify/ajv-compiler` 4.0.5 → 4.0.6 (transitive)
- `@fastify/forwarded` 3.0.1 → 3.0.2 (transitive)
- `@fastify/send` 4.1.0 → 4.1.1 (transitive)
- `brace-expansion` 5.0.7 → 5.0.9 (transitive)
- `fast-uri` 3.1.3 → 3.1.5 (transitive)
- `find-my-way` 9.6.0 → 9.8.0 (transitive)
- `ipaddr.js` 2.4.0 → 2.5.0 (transitive)
- `mdurl` 2.0.0 → 2.1.0 (transitive)
- `minimatch` 10.2.5 → 10.2.6 (transitive)
- `process-warning` 5.0.0 → 5.1.0 (transitive)

## [0.9.1] - 2026-07-18

Maintenance release: dependency and CI updates only; no functional changes.

### Documentation

- `src/hooks/onResponse.ts`: the JSDoc comment no longer `{@link}`s the private `sanitize` helper
  (which is not part of the generated documentation), fixing a TypeDoc warning
- `README.md`: version badge updated to 0.9.1

### Dependencies

- `@darthcav/ts-utils` 0.10.6 → 0.10.8
- `fastify` 5.8.5 → 5.10.0
- `@fastify/compress` 9.0.0 → 9.1.0
- `@fastify/cors` 11.2.0 → 11.3.0
- `@fastify/etag` 6.1.0 → 6.2.0
- `@fastify/helmet` 13.0.2 → 13.1.0
- `@fastify/static` 9.1.3 → 10.1.0
- `@fastify/swagger` 9.7.0 → 9.8.1
- `@fastify/swagger-ui` 6.0.0 → 6.1.0
- `@logtape/fastify` 2.1.5 → 2.2.4
- `@logtape/logtape` 2.1.5 → 2.2.4
- `picomatch` 4.0.4 → 4.0.5
- `@biomejs/biome` 2.5.0 → 2.5.4
- `@types/node` 25.9.3 → 26.1.1
- `prettier` 3.8.4 → 3.9.5
- `typedoc` 0.28.19 → 0.28.20
- `semver` 7.8.4 → 7.8.5 (transitive)

### CI

- `actions/checkout` v6 → v7 (all workflows)
- `actions/setup-node` v6 → v7 (`tests.yml`, `gh-pages.yml`, `publish.yml`)

## [0.9.0] - 2026-06-18

### Security

- `src/auth/keycloak.ts`: the Keycloak JWT verifier now validates the token `aud` (audience) claim
  against `config.clientId` and restricts the accepted signature algorithm to `RS256`, in addition
  to the existing issuer and signature checks. Tokens minted for other clients in the same realm are
  no longer accepted (audience-confusion / privilege-escalation fix).
- `src/defaults/defaultPlugins.ts`: CORS now defaults to `origin: false` (same-origin only) instead
  of `origin: true`, which reflected every request `Origin`. Cross-origin access is opt-in via the
  new `cors` option.
- `src/defaults/defaultErrorHandler.ts`: non-Boom (unexpected) errors no longer leak `error.message`
  to the client. The real error is logged server-side via `request.log.error`, and the response
  carries only the generic HTTP status reason phrase (e.g. `"Internal Server Error"`). Boom errors,
  which have curated client-facing payloads, are unchanged.
- `src/defaults/defaultFastifyOptions.ts`: `trustProxy` now defaults to `false` instead of `true`,
  so `X-Forwarded-For` (and `request.ip`) cannot be spoofed when the server is not behind a trusted
  proxy. `src/start.ts` reads a new `TRUST_PROXY` env var (`true`/`false`, a hop count, or a
  comma-separated IP/CIDR allowlist) to opt in.
- `src/hooks/onResponse.ts`: client-controlled values in the access-log line (request URL,
  `Referer`, and `User-Agent`) are now sanitized — ASCII control characters, including CR and LF,
  are replaced with the Unicode replacement character `�`, so a crafted header can no longer forge
  or split log entries (CWE-117 log injection).
- `src/defaults/defaultPlugins.ts`: Swagger UI (`/docs`) and the OpenAPI spec endpoints, which
  publish the full endpoint map and were reachable unauthenticated, are now gated behind a new
  `docs` option. It defaults to `true` unless `NODE_ENV === "production"`, where it defaults to
  `false`. `src/start.ts` reads a new `ENABLE_DOCS` env var (`true`/`false`) to override.
- `src/defaults/defaultPlugins.ts`: removed `'unsafe-inline'` from the global Helmet CSP
  `script-src`, which previously weakened XSS protection for every route. Swagger UI now emits its
  own self-contained CSP scoped to the `/docs` routes (via the `staticCSP` option), so the relaxed
  policy no longer applies app-wide.

### Changed

- **Breaking:** removed the unused `clientSecret` field from `KeycloakAuthConfig` (`src/types.ts`).
  A JWKS-based resource server never used it; `KEYCLOAK_CLIENT_SECRET` is no longer read in
  `src/start.ts` and is no longer required to enable Keycloak authentication.
- **Breaking:** `defaultPlugins` no longer enables permissive CORS by default. Cross-origin requests
  are disabled unless an allowlist is supplied via the new `DefaultPluginsOptions.cors` option
  (forwarded to `@fastify/cors`, merged over `{ origin: false }`).

## [0.8.0] - 2026-06-18

### Added

- `src/handlers/methodNotAllowedHandler.ts`: `createMethodNotAllowedHandler(allowedMethods)` —
  factory returning a Fastify route handler that responds `405 Method Not Allowed` with an `Allow`
  header listing the permitted methods; exported from the public API and used by `defaultRoutes` for
  the `/` and `/api/` catch-all method routes
- `src/defaults/defaultRoutes.ts`: default `GET /health` (and `HEAD /health`) endpoint returning an
  `application/health+json` report (IETF "Health Check Response Format for HTTP APIs") with service
  `status`, version/release/service identifiers, `timestamp`, process `uptime`, `environment`
  (Node.js version, platform, arch, pid, `NODE_ENV`), and `memory` usage; other methods respond
  `405 Method Not Allowed`
- `src/defaults/defaultRoutes.ts`: pluggable dependency health checks via
  `defaultRoutes({ healthChecks })`. Checks run concurrently on each `/health` request, are grouped
  into the IETF `checks` object keyed by `componentName:measurementName`, and a thrown check is
  reported as `fail` with the error message in `output`. The overall `status` is the worst of all
  checks (`fail` > `warn` > `pass`); the endpoint responds `200` for `pass`/`warn` and `503` for
  `fail`
- `src/types.ts`, `src/index.ts`: new exported types `HealthStatus`, `HealthCheck`,
  `HealthCheckResult`, and `DefaultRoutesOptions`
- `src/openapi/api.yaml`: documented the `/health` path under a new `health` tag, added the
  `HealthStatus` schema (including the `checks` object), and the `503` response

### Changed

- `src/defaults/defaultRoutes.ts`: the two `/`-and-`/api/` 405 handlers now delegate to
  `createMethodNotAllowedHandler` instead of duplicating the `Allow`-header-and-throw logic; the
  `GET /` and `GET /api/` content-negotiation `switch` statements were simplified to guard clauses
- `src/defaults/defaultPlugins.ts`: extracted the duplicated OpenAPI operation guard into a single
  `isOperationObject` type guard
- `src/launcher.ts`, `src/start.ts`: LogTape `Logger` calls now use LogTape's tagged-template syntax
  (`` logger.error`...` ``) for structured logging, matching the convention in `@darthcav/ts-utils`
  (the Fastify pino-style `request.log`/`reply.log` calls in the hooks are unchanged)
- `src/defaults/getConsoleFastifyLogger.ts`: `name` parameter widened to `readonly string[]`, so
  `defaultFastifyOptions` passes `logger.category` directly instead of copying it with a spread

### Tests

- `src/__tests__/methodNotAllowedHandler.test.ts`: new suite covering the `Allow` header contents
  (multiple methods, single method) and the Boom `405` thrown by `createMethodNotAllowedHandler`
- `src/__tests__/defaultRoutes.test.ts`: new cases covering `GET /health` (200
  `application/health+json` with `status: "pass"` and environment fields, no `checks` when none
  configured), `HEAD /health`, and the `405` responses for `DELETE`/`POST /health`; plus suites for
  dependency checks — `503` aggregation with `pass`/`warn`/thrown (`fail`) checks, and `200`/`warn`
  when the worst check is `warn`

## [0.7.2] - 2026-06-15

### Added

- `src/hooks/preHandler.ts`: `NO_CONTENT_PATHS` set of browser-initiated probe paths (currently the
  Chromium DevTools workspace-discovery endpoint
  `/.well-known/appspecific/com.chrome.devtools.json`); requests whose URL matches are
  short-circuited with an empty `204 No Content` response instead of falling through to the
  `notFound` handler and being logged as 404 errors

### Changed

- `src/hooks/preHandler.ts`: the previously unused `_reply` parameter is now used (`reply`) to send
  the `204` short-circuit response
- `biome.json`: migrated the deprecated `"recommended": true` linter field to the new
  `"preset": "recommended"` form (via `biome migrate`)

### Tests

- `src/__tests__/launcher.test.ts`: added coverage for the DevTools probe path returning `204`

### Dependencies

- `@darthcav/ts-utils` 0.10.4 → 0.10.5
- `@fastify/compress` 8.3.1 → 9.0.0
- `@fastify/swagger-ui` 5.2.6 → 6.0.0
- `@fastify/view` 11.1.1 → 12.0.0
- `@logtape/fastify` 2.1.1 → 2.1.4
- `@logtape/logtape` 2.1.1 → 2.1.4
- `ejs` 5.0.2 → 6.0.1
- `@biomejs/biome` 2.4.15 → 2.5.0
- `@types/node` 25.9.1 → 25.9.3
- `prettier` 3.8.3 → 3.8.4
- `hasown` 2.0.3 → 2.0.4
- `lru-cache` 11.5.0 → 11.5.1
- `semver` 7.8.1 → 7.8.4
- `package-lock.json`: added `libc: ["glibc"]` fields to platform-specific entries

## [0.7.1] - 2026-05-24

### Changed

- `src/defaults/defaultErrorHandler.ts`, `src/defaults/defaultFastifyOptions.ts`,
  `src/defaults/defaultRoutes.ts`, `src/hooks/authPreHandler.ts`, `src/hooks/onResponse.ts`,
  `src/hooks/preHandler.ts`, `src/launcher.ts`: added or expanded JSDoc comments on all exported
  symbols
- `tsconfig.json`: removed inline comment annotations (no functional change)
- Node.js minimum engine version raised to `>=26`
- `Dockerfile`: base image updated from `node:25-alpine` to `node:26-alpine`
- CI workflows (`tests.yml`, `gh-pages.yml`, `publish.yml`): Node.js pinned to `26.x`
- `README.md`, `CLAUDE.md`: updated all Node.js version references from 25 to 26

### Refactored

- `src/defaults/defaultErrorHandler.ts`: extracted private `sendError` helper; HTML/JSON/plain-text
  response dispatch for both Boom and generic error paths now flows through a single function,
  eliminating the duplicated switch block
- `src/hooks/onResponse.ts`: streamlined response logging
- `src/start.ts`: refactored environment variable handling and startup sequence

### Dependencies

- `@darthcav/ts-utils` 0.9.0 → 0.10.4
- `@biomejs/biome` 2.4.12 → 2.4.15
- `@logtape/fastify` 2.0.5 → 2.1.1
- `@logtape/logtape` 2.0.5 → 2.1.1
- `yaml` 2.8.3 → 2.9.0
- `jose` 6.2.2 → 6.2.3
- `@types/node` 25.6.0 → 25.9.1

## [0.7.0] - 2026-04-22

### Changed

- `.prettierrc.json`: `printWidth` reduced from 120 → 100 to align with `template-typescript`
- `CLAUDE.md`: enriched with Git Workflow (branching strategy, conventional commits, pre-merge
  checklist), expanded Commands section (individual test examples), Architecture section
  (entrypoints, build/package, env vars, CI/CD workflows), and additional Code Style note (prefer
  `type` over `interface`)
- `.github/copilot-instructions.md`, `CHANGELOG.md`, `README.md`: prose reflowed to match new
  100-char `printWidth`

## [0.6.0] - 2026-04-01

### Added

- `src/auth/keycloak.ts`: `createKeycloakVerifier(config: KeycloakAuthConfig)` — factory that
  returns a `TokenVerifier` backed by the Keycloak realm's JWKS endpoint; keys are fetched lazily
  and cached with automatic rotation via `jose`
- `src/hooks/authPreHandler.ts`: `createAuthPreHandler(authPaths)` — factory that compiles picomatch
  glob patterns once and returns a global Fastify `preHandler` hook; routes whose URL matches a
  pattern require a valid bearer token via the `verifyToken` decorator; non-matching routes pass
  through unconditionally
- `src/types.ts`: `KeycloakAuthConfig` — Keycloak connection config (url, realm, clientId,
  clientSecret)
- `src/types.ts`: `TokenVerifier` — async function type receiving the raw `Authorization` header and
  returning `true`/`false`
- `src/types.ts`: `authPaths?: string[]` on `LauncherLocals` — picomatch glob patterns for protected
  routes (e.g. `["/api/**"]`); when `undefined`, authentication is disabled
- `src/types.ts`: `authRealm?: string` on `LauncherLocals` — protection-space label for the
  `WWW-Authenticate: Bearer realm="..."` challenge (RFC 6750); defaults to `"api"` when omitted;
  populated from `KEYCLOAK_REALM` by `start.ts`
- `src/types.ts`: `verifyToken?: TokenVerifier` on `LauncherOptions`; Fastify module augmentation
  exposing `locals: LauncherLocals` and `verifyToken: TokenVerifier` as first-class decorators on
  `FastifyInstance`
- `src/types.ts`: `DefaultPluginsOptions` — exported options type for `defaultPlugins`
- `src/defaults/defaultPlugins.ts`: `@fastify/swagger` (static mode, fully inlined OpenAPI document)
  and `@fastify/swagger-ui` (served at `/docs/`) plugins; optional `keycloakAuth` injects an
  `openIdConnect` security scheme with the realm's discovery URL into the OpenAPI document
- `src/defaults/defaultPlugins.ts`: `connectSrc` CSP directive allowing `https://cdn.jsdelivr.net/`
  — fixes browser console error when fetching Bootstrap source maps
- `src/defaults/defaultRoutes.ts`: `GET /api/` route returning a JSON welcome message
  (content-negotiated; 406 for non-JSON); `DELETE|PATCH|POST|PUT /api/` returning 405 with
  `Allow: GET, HEAD`
- `src/openapi/api.yaml`: full OpenAPI 3.1 document with `operationId` on all operations,
  `WelcomeMessage` and `Error` component schemas, and a placeholder `openIdConnect` security scheme
  (overridden at runtime by `defaultPlugins`)
- `src/views/index.ejs`: link to `/docs/` OpenAPI documentation
- `src/start.ts`: reads `API_AUTH_PATHS` (comma-separated picomatch globs), `KEYCLOAK_URL`,
  `KEYCLOAK_REALM` (also set as `locals.authRealm`), `KEYCLOAK_CLIENT_ID`, and
  `KEYCLOAK_CLIENT_SECRET` env vars
- `jose` production dependency for JWKS fetching and JWT verification
- `picomatch` production dependency for glob pattern matching; `@types/picomatch` dev dependency

### Fixed

- `src/defaults/defaultPlugins.ts`: `postProcessor` was `async` inside `forEach`, silently dropping
  all Promises and returning an unresolved `Promise` as the swagger document — Swagger UI showed
  "invalid version field". Fixed by resolving `$ref` schemas synchronously with `readFileSync` +
  `for...of` before building the plugin map, and switching to `specification: { document }` (inline)
  instead of `specification: { path, postProcessor }`
- `src/defaults/defaultPlugins.ts`: `$ref` path built with `` `${baseDir}/src/openapi/` `` string
  interpolation broke when `baseDir` was `null` (resolved to `"null/src/openapi/"`); now uses
  `join(srcDir, "openapi", ...)`
- `src/defaults/defaultRoutes.ts`: `this?.locals?.pkg?.name` in an arrow function always resolved to
  `undefined` (arrow functions have no own `this`); replaced with `request.server.locals` via the
  new module augmentation
- `src/openapi/api.yaml`: removed invalid `content` block on `HEAD` 200 response (HEAD responses
  must not have a body)
- `src/openapi/schemas/Error.yaml`: `$schema` updated from JSON Schema draft-07 to 2020-12 (required
  by OpenAPI 3.1); `code` field type corrected from `string` to `integer`

### Changed

- `src/types.ts`: `pkg?: object` widened to `pkg?: Record<string, unknown>` for typed property
  access
- `src/defaults/defaultPlugins.ts`: `OpenAPI` import replaced with `OpenAPIV3_1` for precise typing
  of the swagger document and schema objects in the `$ref` resolution loop
- `src/launcher.ts`: conditionally registers `createAuthPreHandler(locals.authPaths)` as a global
  `preHandler` hook when `authPaths` is non-empty; registers `verifyToken` as a Fastify decorator;
  falls back to `async () => false` when not provided

### Tests

- `src/__tests__/keycloak.test.ts`: new suite for `createKeycloakVerifier` using a live mock JWKS
  server and real RS256 key pair; covers undefined header, non-Bearer header, valid JWT, wrong
  issuer, expired JWT, malformed token, and trailing-slash URL normalisation
- `src/__tests__/defaultPlugins.test.ts`: updated plugin count assertion (7 → 9); added checks for
  `@fastify/swagger` and `@fastify/swagger-ui`; added OpenAPI document assertions for the
  auth-enabled and auth-disabled variants
- `src/__tests__/defaultRoutes.test.ts`: added `GET /api/` (200 + 406), `HEAD /api/` (200), and
  `DELETE|PATCH|POST|PUT /api/` (405) coverage; added `authPaths=["/api/**"] + mock verifyToken`
  suite (401/200 + 405 under auth, 200 for non-protected path); added `custom authRealm` suite
  asserting the `WWW-Authenticate` challenge reflects `locals.authRealm`; added `no authPaths` suite
  (all routes public)
- `src/__tests__/launcher.test.ts`: added tests for `statusCode > 599` reset-to-500 and valid
  4xx–5xx status preservation (503) in `defaultErrorHandler`

## [0.5.1] - 2026-03-30

### Fixed

- `Dockerfile`: corrected `ENTRYPOINT` exec-form — was a single string `"node src/start.ts"`
  (invalid), now properly split as `"node", "src/start.ts"`

### Changed

- `Dockerfile`: runtime `WORKDIR` moved from `/app` to `/home/${APP_USER}/app` (inside the `node`
  user's home directory)

### Dependencies

- `prettier`: unpinned range `^3.8.1` → exact `3.8.1`

## [0.5.0] - 2026-03-30

### Changed

- `src/start.ts`: `HOST` and `CONTAINER_EXPOSE_PORT` env vars now resolved here and passed as
  `locals` to launcher
- `src/launcher.ts`: removed `env` import; port default simplified to plain literal `8888` (env var
  reading moved to `start.ts`)
- `.env.example`: added `HOST` and `CONTAINER_EXPOSE_PORT` entries
- `.prettierrc.json`: added Prettier configuration for markdown files (`proseWrap`, `printWidth`,
  `embeddedLanguageFormatting`)
- `README.md`: formatting improvements

## [0.4.0] - 2026-03-29

### Changed

- `Dockerfile`: replaced `CMD ["npm", "run", "start"]` with `ENTRYPOINT` running `node src/start.ts`
  directly
- `Dockerfile`: removed `COPY .env.example .env.local` — environment is now supplied via Docker env
  vars at runtime
- `.env.example`: removed `LOCALHOST` variable
- Added `compose.yml` for pulling and running the published GHCR image

## [0.3.4] - 2026-03-29

### CI

- `docker/login-action` v3 → v4
- `docker/metadata-action` v5 → v6
- `docker/build-push-action` v6 → v7

## [0.3.3] - 2026-03-29

### Changed

- `Dockerfile` rewritten as a multi-stage build (`build` → runtime)
- `Dockerfile`: base image configurable via `BUILD_IMAGE` build arg (default `node:25-alpine`)
- `Dockerfile`: runtime user/group configurable via `APP_USER` / `APP_GROUP` build args (default
  `node:node`); use `user:` in docker-compose to override at runtime
- `Dockerfile`: exposed port configurable via `CONTAINER_EXPOSE_PORT` build arg, also set as a
  runtime `ENV` (default `8888`)
- `Dockerfile`: `build` stage runs `npm ci --no-audit --no-fund` (all dependencies, so the `prepare`
  lifecycle hook compiles TypeScript via `tsc`)

### Dependencies

- `@darthcav/ts-utils` 0.8.4 → 0.8.5
- `fastify` 5.8.2 → 5.8.4
- `@logtape/fastify` 2.0.4 → 2.0.5
- `@logtape/logtape` 2.0.4 → 2.0.5
- `@biomejs/biome` 2.4.8 → 2.4.9
- `typedoc` 0.28.17 → 0.28.18

### CI

- `actions/configure-pages` v5 → v6
- `actions/deploy-pages` v4 → v5
- `codecov/codecov-action` v5 → v6

## [0.3.1] - 2026-03-22

### Fixed

- Codecov badge URL: moved token to query parameter (`?token=K8Q4T4N9SG`)

### Dependencies

- `@darthcav/ts-utils` 0.8.2 → 0.8.4

## [0.3.0] - 2026-03-22

### Added

- `test:coverage:lcov` script for generating LCOV coverage reports
- `start` script as a named entry in package.json scripts
- Codecov integration in CI workflow for coverage reporting
- Biome `useImportsFirst` nursery rule
- Author URL in `package.json`

### Changed

- Bumped version to 0.3.0
- README: Node.js badge now links to nodejs.org; coverage badge replaced with Codecov badge
- Simplified `files` field in `package.json` to use directory-level entries
- Dependabot: set `target-branch: dev` for both npm and GitHub Actions update groups
- CI/CD workflows: pinned action versions to major version only (e.g. `v6.0.2` → `v6`)
- Renamed CI workflow to `lint/test/coverage CI`
- `main()` call in `start.ts` updated to match new `@darthcav/ts-utils` signature
- Reordered exports in `index.ts` (`onResponse` before `preHandler`)

### Dependencies

- `lru-cache` 11.2.6 → 11.2.7
- `safe-regex2` 5.0.0 → 5.1.0
- `yaml` 2.8.2 → 2.8.3

## [0.2.0] - initial release
