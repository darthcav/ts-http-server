# Copilot Instructions

## Build, test, and lint

- Use Node.js 25+; this project relies on native TypeScript execution and ESM.
- If `.env.local` is missing, create it from `.env.example` before running tests or `npm start`.
- Install dependencies with `npm install` for local work or `npm ci` in CI-like validation.
- Build the package with `npm run build`.
- Type-check without emitting with `npm run typecheck`.
- Run the full test suite with `npm test`.
- Run coverage with `npm run test:coverage` or `npm run test:coverage:lcov`.
- Run one test file with `node --env-file=.env.local --test --test-reporter=spec src/__tests__/defaultRoutes.test.ts`.
- Run one named test with `node --env-file=.env.local --test --test-reporter=spec --test-name-pattern="GET / → 200 text/html" src/__tests__/defaultRoutes.test.ts`.
- Lint with `npm run lint`; auto-fix with `npm run lint:fix`.
- Generate API docs with `npm run doc`.

## High-level architecture

- `src/index.ts` is the library entrypoint. It re-exports the launcher, default Fastify wiring, hooks, and shared types.
- `src/start.ts` is the runnable app entrypoint used by `npm start`. It creates the LogTape logger, builds `locals`, gets the default plugin and route maps, starts the server with `launcher()`, and installs `SIGINT` / `SIGTERM` shutdown handlers.
- `src/launcher.ts` is the composition root. It:
  - creates the Fastify instance by merging `defaultFastifyOptions(logger)` with caller overrides,
  - decorates `fastify.locals` plus any extra decorators,
  - registers plugins and routes from `Map` objects,
  - installs the default 404 handler and `defaultErrorHandler`,
  - adds the shared `preHandler` and `onResponse` hooks,
  - starts listening and returns the `FastifyInstance`.
- `src/defaults/defaultPlugins.ts` defines the default plugin stack: `@fastify/accepts`, `compress`, `cors`, `etag`, `helmet`, `view`, and `static`. This file also wires EJS templates from `src/views` and static assets from `src/public`.
- `src/defaults/defaultRoutes.ts` defines the default home route behavior. `GET /` renders `index.ejs` only for HTML requests; other methods on `/` return `405`, and non-HTML `GET /` requests become `406`.
- `src/defaults/defaultErrorHandler.ts` is responsible for content negotiation on errors. It renders `_error.ejs` for HTML, returns JSON for API clients, and falls back to plain text otherwise.
- `src/hooks/preHandler.ts` and `src/hooks/onResponse.ts` provide the request/access logging strategy. Fastify's built-in request logging is disabled in `defaultFastifyOptions`, so these hooks are the main logging path.
- There are two different `public` concepts in this repo:
  - `src/public/` contains runtime static assets served by `@fastify/static`.
  - root `public/` is generated output from `npm run doc` for GitHub Pages / TypeDoc.

## Key conventions

- Keep the project ESM-only and use `.ts` extensions in imports.
- Stick to erasable TypeScript syntax only; the project assumes Node's native TypeScript execution rather than a runtime transpiler.
- Exported functions and exported types use JSDoc, and exported functions should keep explicit return types.
- Follow the map-based extension pattern:
  - plugins are `Map<string, FSTPlugin>`
  - routes are `Map<string, RouteOptions>`
  - optional decorators are `Map<string, unknown>`
  `launcher()` iterates map values directly, so insertion order matters when adding defaults.
- `defaultPlugins({ locals, baseDir })` uses `locals.pkg` as the default EJS view context. Preserve that behavior when changing template rendering.
- `defaultPlugins()` resolves `src/views` and `src/public` from `baseDir` when supplied; otherwise it resolves relative to the package source. Keep that in mind when changing path logic or tests.
- Error handling depends on the accepts/view plugins being available. If you customize plugin registration, make sure content negotiation and HTML error rendering still work.
- Tests live under `src/__tests__/` and use Node's built-in `node:test` runner with `suite()` and `test()`, not Jest/Vitest-style APIs.
- Existing HTTP tests start real servers on fixed ports (`19001`-`19003`) and wait briefly before requests instead of using `fastify.inject()`. Match that style unless there is a strong reason to change it.
- CI in `.github/workflows/tests.yml` validates with `npm ci`, `npm run lint`, `npm run build`, copies `.env.example` to `.env.local`, then runs tests and coverage. Keep local validation aligned with that flow.
