# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Git Workflow

### Branching Strategy

- **Main branch**: `main` - production-ready code only
- **Feature branches**: `feature/<feature-name>` - for new features
- **Bugfix branches**: `fix/<issue-description>` - for bug fixes
- **Always create a feature branch** before making changes to existing functionality

### Commit Practices

- **Commit incrementally** - small, focused commits that do one thing
- **Use conventional commits** format:
    - `feat:` - new features
    - `fix:` - bug fixes
    - `docs:` - documentation changes
    - `refactor:` - code refactoring
    - `test:` - adding or updating tests
    - `chore:` - maintenance tasks
- **Write descriptive commit messages** with a summary line and bullet points for details
- **Verify build passes** before committing (`npm run build`)

### Before Merging or Pushing

- Test changes locally (`npm run test` and `npm run lint`)
- Ensure no TypeScript errors
- Review the diff for unintended changes
- **Update tests** — if the change adds, removes, or modifies user-visible features, add or update
  tests in `src/__tests__/` to cover the new behavior and ensure existing tests still pass.
- **Check coverage** — ensure test coverage does not decrease and critical paths are covered.
- **Run lint** — ensure code style is consistent and no lint errors are introduced.
- **Update documentation** — if the change adds, removes, or modifies user-visible features, update
  `README.md` (feature descriptions, route table, env vars) and any relevant guides before merging.

## Stack

- Node.js >= 25 with native TypeScript execution (type stripping)
- TypeScript with strict mode and isolated declarations
- Only erasable TS syntax (no enums, no runtime namespaces, no parameter properties)
- ESM only (`"type": "module"`)
- Prefer `type` over `interface` for type declarations where equivalent and not conflicting with TS
  best practices
- Biome for linting and formatting, Prettier for Markdown
- Node.js built-in test runner (`node:test`)
- TypeDoc for API documentation

## Commands

### Build & Compilation

- `npm run build` — compile TypeScript to JavaScript (outputs to `dist/`)
- `npm run clean` — remove compiled output
- `npm run typecheck` — type-check without emitting files

### Runtime & Development

- `npm start` — run the application entrypoint directly from TypeScript (`.env.local` required)
- `npm test` — run all tests using Node's built-in test runner
- `npm run test:coverage` — run tests with coverage reporting
- `npm run lint` — check with Biome and Prettier (validates `.md` files too)
- `npm run lint:fix` — auto-fix formatting and lint issues with Biome and Prettier
- `npm run doc` — generate TypeDoc documentation to `public/`

### Running Individual Tests

- Single test file:
  `node --env-file=.env.local --test --test-reporter=spec src/__tests__/launcher.test.ts`
- Test by name pattern:
  `node --env-file=.env.local --test --test-name-pattern="pattern" src/__tests__/launcher.test.ts`
- Coverage with LCOV format: `npm run test:coverage:lcov` (writes to `coverage/lcov.info`)

## Architecture

### Entrypoints & Runtime Bootstrapping

- **`src/index.ts`** — Library/package entrypoint. Re-exports the public API and is the TypeDoc
  source.
- **`src/start.ts`** — Runtime/application entrypoint for `npm start`. Reads `package.json`, creates
  the logger via `@darthcav/ts-utils`, and invokes `main(...)`.
- **`src/launcher.ts`** — Customization point for application startup. Receives a logger and handles
  server startup, route registration, and other runtime wiring.

### Build & Package Publishing

- `npm start` and `npm test` execute `.ts` files directly via Node; they do not use compiled output.
- `npm run build` compiles `src/` to `dist/` and emits type declarations (`.d.ts`, `.d.ts.map`).
- `package.json` exports the built `dist/index.js` and `dist/index.d.ts`, so the public API flows
  through `src/index.ts`.
- Test files in `src/__tests__/` are excluded from package distribution via the `"files"` field.

### Environment Variables

- `.env.example` provides placeholders. Create `.env.local` from it before running `npm start` or
  tests.
- Both `npm start` and `npm test` use Node's `--env-file` to load `.env.local`.

### CI/CD Workflows

- **`.github/workflows/tests.yml`** — Runs lint, build, tests, and LCOV coverage on Node 25 for
  pushes to `dev` and pull requests. Uses `.env.example` copied to `.env.local`.
- **`.github/workflows/gh-pages.yml`** — Builds TypeDoc and deploys `public/` to GitHub Pages from
  `main` branch.
- **`.github/workflows/publish.yml`** — Manual trigger for npm publishing; expects clean build.
- **`.github/workflows/docker-publish.yml`** — Manual trigger for Docker image to GHCR.

## Code Style

- Biome handles formatting and linting; 4 spaces indentation, LF line endings, semicolon-free
  JavaScript/TypeScript
- Use JSDoc comments for all exported functions and types
- Use `import type` for type-only imports (`verbatimModuleSyntax`)
- Use `.ts` extensions in imports (`allowImportingTsExtensions`); `tsc` rewrites to `.js` in output
- Exported functions must have explicit return types (`isolatedDeclarations`)
- Keep runtime TypeScript erasable: avoid enums, parameter properties, runtime namespaces, and other
  non-erasable TS syntax (enforced by `erasableSyntaxOnly`)
- Prefer `type` over `interface` for type declarations where equivalent and not conflicting with TS
  best practices
- Check lint, documentation and test coverage, including `*.md` files after every change to ensure
  quality and consistency

## Testing

- Use `node:test` and `node:assert/strict`
- Tests must use `suite` and `test` instead of `describe` and `it` from `node:test`
- Use `asserttt` for type-level assertions
- Test files go in `src/__tests__/` with `*.test.ts` suffix
- Package distribution excludes `src/__tests__/` via the `"files"` field
