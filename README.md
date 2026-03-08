# template-typescript

![Node][node-version] ![Version][version-image] ![CI][ci-badge] ![Coverage][coverage-badge]

A general-purpose TypeScript project template for Node.js >= 25.

[API Documentation][pages-url]

## Features

- Native TypeScript execution (Node.js type stripping, no transpiler needed at runtime)
- Strict TypeScript configuration with isolated declarations
- Biome for linting and formatting
- Built-in Node.js test runner
- TypeDoc for API documentation
- GitHub Actions CI/CD workflows

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
  launcher.ts       # Application launcher
  __tests__/        # Test files
dist/               # Compiled output (generated)
public/             # Documentation output (generated)
```

## License

[Apache-2.0](LICENSE)

[node-version]: https://img.shields.io/badge/node-%3E%3D25-orange.svg?style=flat-square
[version-image]: https://img.shields.io/badge/version-0.1.0-blue.svg?style=flat-square
[ci-badge]: https://github.com/darthcav/template-typescript/actions/workflows/tests.yml/badge.svg
[coverage-badge]: https://img.shields.io/badge/coverage-check%20CI-yellow.svg?style=flat-square
[pages-url]: https://darthcav.github.io/template-typescript/
