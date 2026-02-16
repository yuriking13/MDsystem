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
- `style={...}` usage is disallowed in `apps/web/src` (class-based styling only);
- no direct DOM style mutations (`.style.*` / `setAttribute("style", ...)`) in web source.
- any `height|min-height|max-height: 100vh` declaration in web CSS must be followed by a `100dvh` fallback line.
- `AppLayout` and `AdminLayout` must use shared responsive helpers (`apps/web/src/lib/responsive.ts`) instead of comparing `window.innerWidth` directly.
- `apps/web/package.json` script `test:responsive` must include the required responsive regression suite list (guarded by `tests/config/responsiveSuiteContract.test.ts`).
- `apps/web/package.json` script `test:responsive` must keep the canonical target order (no unexpected/duplicate/reordered suites).
- `apps/web/tests/components/AppLayout.test.tsx` and `apps/web/tests/pages/AdminLayout.test.tsx` must avoid numeric `setViewportWidth(...)` literals and use shared responsive fixtures/constants.
- `apps/web/tests/components/AppLayout.test.tsx` and `apps/web/tests/pages/AdminLayout.test.tsx` must derive mobile/open expectations with `isAppMobileViewport` / `isAdminMobileViewport` rather than direct width comparisons.
- `apps/web/tests/components/AppLayout.test.tsx` and `apps/web/tests/pages/AdminLayout.test.tsx` must avoid inline numeric viewport arrays and iterate shared matrix constants (`TARGET_VIEWPORT_WIDTHS`, `MOBILE_VIEWPORT_WIDTHS`, etc.).

Run all checks from the workspace root:

- Repository guard checks: `pnpm run quality:repo`
- Remove WEB JS mirrors: `pnpm run clean:js-mirrors`
- Check WEB JS mirrors only: `pnpm run check:js-mirrors`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test`
- Responsive matrix regression tests: `pnpm test:responsive`
- Coverage: `pnpm test:coverage`
- Build: `pnpm build`

The guard script can also be run directly:

- `pnpm run quality:guards` (auto-cleans WEB JS mirrors, then checks)
- `pnpm run quality:guards:check` (strict check mode, no auto-clean; used by root scripts and CI)
- `pnpm run quality:guards:test` (unit tests for guard logic)

## Responsive QA matrix

For manual UI validation, use these baseline viewport widths:

- 360
- 390
- 768
- 1024
- 1280
- 1440
- 1920

Primary routes to verify:

- User: `/login`, `/register`, `/projects`, `/settings`, `/docs`
- Project tabs: `/projects/:id?tab=articles|documents|files|statistics|settings|graph`
- Document editor: `/projects/:projectId/documents/:docId`
- Admin shell and pages: `/admin` plus major sections (`users`, `projects`, `articles`, `activity`, `sessions`, `jobs`, `errors`, `audit`, `system`, `settings`)

Automated responsive regression coverage for this matrix lives in:

- `apps/web/tests/components/AppLayout.test.tsx`
- `apps/web/tests/pages/AdminLayout.test.tsx`
- `apps/web/tests/components/AppSidebar.test.tsx`
- `apps/web/tests/styles/articlesLayout.test.ts`
- `apps/web/tests/styles/legacyResponsiveSafeguards.test.ts`
- `apps/web/tests/styles/layoutResponsiveShell.test.ts`
- `apps/web/tests/styles/docsAndGraphResponsive.test.ts`
- `apps/web/tests/styles/projectsAndSettingsResponsive.test.ts`
- `apps/web/tests/styles/adminPagesResponsive.test.ts`
- `apps/web/tests/styles/authResponsive.test.ts`
- `apps/web/src/lib/responsive.test.ts`
- `apps/web/tests/utils/responsiveMatrix.test.ts`
- `apps/web/tests/utils/viewport.test.ts`
- `apps/web/tests/config/responsiveSuiteContract.test.ts`
- `apps/web/tests/config/responsiveTestConventions.test.ts`

Canonical ordered target list for `apps/web/package.json` `test:responsive` is stored in:

- `apps/web/tests/config/responsiveSuiteTargets.json`

Quick run for this focused suite:

- Workspace root: `pnpm test:responsive`
- Web app only: `pnpm --filter web run test:responsive`
