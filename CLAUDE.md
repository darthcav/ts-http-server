# Project Conventions

## Stack

- Node.js >= 25 with native TypeScript execution (type stripping)
- TypeScript with strict mode and isolated declarations
- Only erasable TS syntax (no enums, no runtime namespaces, no parameter properties)
- ESM only (`"type": "module"`)

## Commands

- `npm run build` — compile TypeScript to JavaScript
- `npm run clean` — remove compiled output
- `npm start` — run once with .env.local
- `npm run typecheck` — type-check without emitting
- `npm test` — run tests (Node.js built-in test runner)
- `npm run test:coverage` — run tests with coverage
- `npm run lint` — check with Biome
- `npm run lint:fix` — auto-fix with Biome
- `npm run doc` — generate TypeDoc documentation

## Code Style

- Biome handles formatting and linting
- 4 spaces indentation, LF line endings
- Use JSDoc comments for all exported functions and types
- Use `import type` for type-only imports (`verbatimModuleSyntax`)
- Use `.ts` extensions in imports (`allowImportingTsExtensions`)
- Exported functions must have explicit return types (`isolatedDeclarations`)
- Check lint, documentation and test coverage, including \*md files after every change to ensure quality and consistency

## Testing

- Use `node:test` and `node:assert/strict`
- Tests must use `suite` and `test` instead of `describe` and `it` from `node:test`
- Use `asserttt` for type-level assertions
- Test files go in `src/__tests__/` with `*.test.ts` suffix
