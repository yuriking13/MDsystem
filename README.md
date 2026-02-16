# MDsystem

MDsystem is a monorepo with API and web apps for managing and searching document data.

## Structure

- apps/api: backend service
- apps/web: frontend application
- deploy: deployment configs
- scripts: setup helpers
- theme-editor: local theme editor

## Requirements

- Node.js and pnpm

## Install

pnpm install

## Development

- API: pnpm --filter @mdsystem/api dev
- Web: pnpm --filter @mdsystem/web dev

## Build

pnpm -r build

## Quality checks

The repository enforces strict quality gates for TypeScript and UI code:

- no explicit `any` typings in API and web TypeScript files;
- no JavaScript/JSX source files in `apps/web/src` (TypeScript-only source tree);
- no inline JSX style literals (`style={{ ... }}`) in the web app;
- `style={...}` usage is blocked in web source except for a temporary legacy allowlist;
- no direct DOM style mutations (`.style.*` / `setAttribute("style", ...)`) in web source.

Run all checks from the workspace root:

- Repository guard checks: `pnpm run quality:repo`
- Remove WEB JS mirrors: `pnpm run clean:js-mirrors`
- Check WEB JS mirrors only: `pnpm run check:js-mirrors`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test`
- Coverage: `pnpm test:coverage`
- Build: `pnpm build`

The guard script can also be run directly:

- `pnpm run quality:guards` (auto-cleans WEB JS mirrors, then checks)
- `pnpm run quality:guards:check` (strict check mode, no auto-clean; used by root scripts and CI)
- `pnpm run quality:guards:test` (unit tests for guard logic)
