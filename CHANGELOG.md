# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2026-03-29

### CI

- `docker/login-action` v3 → v4
- `docker/metadata-action` v5 → v6
- `docker/build-push-action` v6 → v7

## [0.3.3] - 2026-03-29

### Changed

- `Dockerfile` rewritten as a multi-stage build (`build` → runtime)
- `Dockerfile`: base image configurable via `BUILD_IMAGE` build arg (default `node:25-alpine`)
- `Dockerfile`: runtime user/group configurable via `APP_USER` / `APP_GROUP` build args (default `node:node`); use `user:` in docker-compose to override at runtime
- `Dockerfile`: exposed port configurable via `CONTAINER_EXPOSE_PORT` build arg, also set as a runtime `ENV` (default `8888`)
- `Dockerfile`: `build` stage runs `npm ci --no-audit --no-fund` (all dependencies, so the `prepare` lifecycle hook compiles TypeScript via `tsc`)

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
