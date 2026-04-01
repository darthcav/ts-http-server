# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `src/types.ts`: replaced `ApiAuthConfig` / `ApiAuthValidator` with `KeycloakAuthConfig` and `TokenVerifier`; added
  `authRequired?: boolean` to `LauncherLocals`; added `verifyToken?: TokenVerifier` to `LauncherOptions`; extended the
  `FastifyInstance` augmentation with a `verifyToken: TokenVerifier` decorator
- `src/defaults/defaultRoutes.ts`: auth pre-handler is now always attached to `/api/` routes and reads
  `request.server.locals.authRequired` at request time instead of being conditionally wired at route-map build time;
  removed the `createApiAuthPreHandler` factory; `DefaultRoutesOptions` no longer carries auth configuration
- `src/defaults/defaultPlugins.ts`: `configureApiDocumentAuth` now expects `KeycloakAuthConfig` and generates an
  `openIdConnect` security scheme with the realm's discovery URL instead of a static `bearerAuth` scheme;
  `DefaultPluginsOptions.apiAuth` replaced with `DefaultPluginsOptions.keycloakAuth`
- `src/launcher.ts`: registers `verifyToken` as a Fastify decorator alongside `locals`; falls back to
  `async () => false` when not provided
- `src/start.ts`: reads `API_AUTH_REQUIRED`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`,
  `KEYCLOAK_CLIENT_SECRET` env vars; removed `API_BEARER_TOKEN` and `API_AUTH_REALM`
- `src/openapi/api.yaml`: removed static `bearerAuth` security scheme (now injected dynamically by `defaultPlugins`)
- `.env.example`: replaced `API_BEARER_TOKEN` / `API_AUTH_REALM` with the five new Keycloak variables
- `README.md`: updated usage examples, feature list, and env-var table to reflect Keycloak auth

### Added

- `src/auth/keycloak.ts`: `createKeycloakVerifier(config)` — factory that creates a `TokenVerifier` backed by the
  Keycloak realm's JWKS endpoint; keys are fetched lazily and cached with automatic rotation via `jose`
- `jose` production dependency for JWKS fetching and JWT verification

### Tests

- `src/__tests__/keycloak.test.ts`: new unit-test suite for `createKeycloakVerifier` using a live mock JWKS server and
  real RS256 key pair; covers undefined header, non-Bearer header, valid JWT, wrong issuer, expired JWT, malformed
  token, and trailing-slash URL normalisation
- `src/__tests__/defaultRoutes.test.ts`: replaced static-bearer-token and custom-validator suites with
  `authRequired=true + mock verifyToken` and `authRequired=false` suites
- `src/__tests__/defaultPlugins.test.ts`: updated auth assertion to check `openIdConnect` scheme and discovery URL

## [0.6.0] - 2026-04-01

### Added

- `src/types.ts`: `ApiAuthConfig` — discriminated union accepting either a static `bearerToken` string or a custom
  `validateAuthorization` async callback, with an optional `realm` for the `WWW-Authenticate` challenge
- `src/types.ts`: `ApiAuthValidator` — callback type for the custom authorization validator
- `src/types.ts`: `DefaultPluginsOptions` and `DefaultRoutesOptions` — options types for `defaultPlugins` and
  `defaultRoutes`, now exported from the package entry point alongside `ApiAuthConfig` and `ApiAuthValidator`
- `src/types.ts`: Fastify module augmentation (`declare module "fastify"`) that exposes `locals: LauncherLocals` on
  `FastifyInstance`, making `request.server.locals` fully typed in route handlers without manual casts
- `src/defaults/defaultPlugins.ts`: `@fastify/swagger` (static mode, fully inlined OpenAPI document) and
  `@fastify/swagger-ui` (served at `/docs/`) plugins; `apiAuth` option marks `/api/` operations as bearer-protected in
  the generated OpenAPI document when provided
- `src/defaults/defaultPlugins.ts`: `connectSrc` CSP directive allowing `https://cdn.jsdelivr.net/` — fixes browser
  console error when fetching Bootstrap source maps
- `src/defaults/defaultRoutes.ts`: `GET /api/` route returning a JSON welcome message (content-negotiated; 406 for
  non-JSON); `DELETE|PATCH|POST|PUT /api/` returning 405 with `Allow: GET, HEAD`; optional `apiAuth` guard that
  challenges unauthenticated requests with `401 Unauthorized` and `WWW-Authenticate: Bearer`
- `src/openapi/api.yaml`: `operationId` on all operations; `summary` on all 405 operations; `securitySchemes.bearerAuth`
  definition under `components`; `WelcomeMessage` response schema extracted into `components/schemas`
- `src/views/index.ejs`: link to `/docs/` OpenAPI documentation
- `src/start.ts`: reads `API_BEARER_TOKEN` (enables bearer auth) and `API_AUTH_REALM` (realm, default `api`) env vars

### Fixed

- `src/defaults/defaultPlugins.ts`: `postProcessor` was `async` inside `forEach`, silently dropping all Promises and
  returning an unresolved `Promise` as the swagger document — Swagger UI showed "invalid version field". Fixed by
  resolving `$ref` schemas synchronously with `readFileSync` + `for...of` before building the plugin map, and switching
  to `specification: { document }` (inline) instead of `specification: { path, postProcessor }`
- `src/defaults/defaultPlugins.ts`: `$ref` path built with `` `${baseDir}/src/openapi/` `` string interpolation — broke
  when `baseDir` was `null` (resolved to `"null/src/openapi/"`). Now uses `join(srcDir, "openapi", ...)`
- `src/defaults/defaultRoutes.ts`: `this?.locals?.pkg?.name` in arrow function always resolved to `undefined` (arrow
  functions have no own `this`). Replaced with `request.server.locals` via the new module augmentation
- `src/defaults/defaultRoutes.ts`: syntax error `request.server.["locals"]` corrected to `request.server.locals`
- `src/openapi/api.yaml`: removed invalid `content` block on `HEAD` 200 response (HEAD responses must not have a body)
- `src/openapi/schemas/Error.yaml`: `$schema` updated from JSON Schema draft-07 to 2020-12 (required by OpenAPI 3.1);
  `code` field type corrected from `string` to `integer`

### Changed

- `src/types.ts`: `pkg?: object` widened to `pkg?: Record<string, unknown>` for typed property access
- `src/types.ts`: `DefaultPluginsOptions` and `DefaultRoutesOptions` moved here from their respective module files so
  that all public option types are co-located and exported from the package entry point
- `src/defaults/defaultPlugins.ts`: `OpenAPI` import replaced with `OpenAPIV3_1` for precise typing of the swagger
  document and schema objects in the `$ref` resolution loop
- `src/defaults/defaultRoutes.ts`: local `DefaultRoutesOptions` and `validateApiAuthorization` helper consolidated —
  auth logic inlined into `createApiAuthPreHandler` to remove the redundant indirection layer

### Tests

- `src/__tests__/defaultPlugins.test.ts`: updated plugin count assertion (7 → 9); added presence checks for
  `@fastify/swagger` and `@fastify/swagger-ui`; added OpenAPI document assertions for the auth-enabled and auth-disabled
  variants of the generated document
- `src/__tests__/defaultRoutes.test.ts`: added coverage for `GET /api/` (200 + 406), `HEAD /api/` (200),
  `DELETE|PATCH|POST|PUT /api/` (all 405); added auth suite covering 401 without/with wrong token and 200 with valid
  token; added suite for custom `validateAuthorization` covering the async callback path
- `src/__tests__/launcher.test.ts`: added test for `statusCode > 599` reset-to-500 branch and for valid 4xx–5xx status
  preservation (503 must not be reset to 500) in `defaultErrorHandler`

## [0.5.1] - 2026-03-30

### Fixed

- `Dockerfile`: corrected `ENTRYPOINT` exec-form — was a single string `"node src/start.ts"` (invalid), now properly
  split as `"node", "src/start.ts"`

### Changed

- `Dockerfile`: runtime `WORKDIR` moved from `/app` to `/home/${APP_USER}/app` (inside the `node` user's home directory)

### Dependencies

- `prettier`: unpinned range `^3.8.1` → exact `3.8.1`

## [0.5.0] - 2026-03-30

### Changed

- `src/start.ts`: `HOST` and `CONTAINER_EXPOSE_PORT` env vars now resolved here and passed as `locals` to launcher
- `src/launcher.ts`: removed `env` import; port default simplified to plain literal `8888` (env var reading moved to
  `start.ts`)
- `.env.example`: added `HOST` and `CONTAINER_EXPOSE_PORT` entries
- `.prettierrc.json`: added Prettier configuration for markdown files (`proseWrap`, `printWidth`,
  `embeddedLanguageFormatting`)
- `README.md`: formatting improvements

## [0.4.0] - 2026-03-29

### Changed

- `Dockerfile`: replaced `CMD ["npm", "run", "start"]` with `ENTRYPOINT` running `node src/start.ts` directly
- `Dockerfile`: removed `COPY .env.example .env.local` — environment is now supplied via Docker env vars at runtime
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
- `Dockerfile`: runtime user/group configurable via `APP_USER` / `APP_GROUP` build args (default `node:node`); use
  `user:` in docker-compose to override at runtime
- `Dockerfile`: exposed port configurable via `CONTAINER_EXPOSE_PORT` build arg, also set as a runtime `ENV` (default
  `8888`)
- `Dockerfile`: `build` stage runs `npm ci --no-audit --no-fund` (all dependencies, so the `prepare` lifecycle hook
  compiles TypeScript via `tsc`)

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
