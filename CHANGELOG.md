# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
