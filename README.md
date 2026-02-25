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
- `apps/web/package.json` script `test:responsive` must stay delegated to `node scripts/run-responsive-suite.mjs`.
- `apps/web/tests/config/responsiveSuiteTargets.json` defines the canonical responsive suite list and order (no unexpected/duplicate/reordered targets).
- `apps/web/tests/components/AppLayout.test.tsx` and `apps/web/tests/pages/AdminLayout.test.tsx` must avoid numeric `setViewportWidth(...)` literals and use shared responsive fixtures/constants.
- `apps/web/tests/components/AppLayout.test.tsx` and `apps/web/tests/pages/AdminLayout.test.tsx` must derive mobile/open expectations with `isAppMobileViewport` / `isAdminMobileViewport` rather than direct width comparisons.
- `apps/web/tests/components/AppLayout.test.tsx` and `apps/web/tests/pages/AdminLayout.test.tsx` must avoid inline numeric viewport arrays and iterate shared matrix constants (`TARGET_VIEWPORT_WIDTHS`, `MOBILE_VIEWPORT_WIDTHS`, etc.).
- `apps/web/tests/components/AppLayout.test.tsx` and `apps/web/tests/pages/AdminLayout.test.tsx` must preserve route/viewport matrix loops for required responsive route fixtures (`APP_NON_FIXED_ROUTE_CASES`, `APP_FIXED_ROUTE_CASES`, `PROJECT_TABS`, `APP_AUTH_ROUTE_CASES`, `APP_ADMIN_NO_SHELL_ROUTE_CASES`, `ADMIN_RESPONSIVE_ROUTE_CASES`).
- `apps/web/tests/config/responsiveManualMatrix.json` must remain a valid manual QA matrix config (required viewport widths/routes plus valid regex patterns for project fixed routes).

Run all checks from the workspace root:

- Repository guard checks: `pnpm run quality:repo`
- Remove WEB JS mirrors: `pnpm run clean:js-mirrors`
- Check WEB JS mirrors only: `pnpm run check:js-mirrors`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test`
- Browser E2E (Playwright): `pnpm --filter web run e2e`
- Responsive matrix regression tests: `pnpm test:responsive`
- Coverage: `pnpm test:coverage`
- Build: `pnpm build`

### Publisher regression checklist

When touching publisher workflow (`apps/api/src/routes/med-publisher.ts`, `apps/web/src/components/PublisherSection.tsx`, `apps/web/src/lib/medPublisherApi.ts`, `apps/api/prisma/migrations/add_med_publisher_v1.sql`), run this focused sequence before pushing:

- `pnpm --filter api typecheck`
- `pnpm --filter web typecheck`
- `pnpm --filter api test -- tests/integration/med-publisher-routes.test.ts`
- `pnpm --filter web test -- tests/components/PublisherSection.test.tsx`
- `pnpm --filter web test -- tests/components/AppThemeBootstrapRuntime.test.tsx`

This checklist is mandatory for publisher changes to prevent route/ACL/UI regressions.

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
- `apps/web/tests/config/responsiveManualMatrixContract.test.ts`
- `apps/web/tests/config/responsiveSuiteContract.test.ts`
- `apps/web/tests/config/responsiveTestConventions.test.ts`

Canonical ordered target list for `apps/web/package.json` `test:responsive` is stored in:

- `apps/web/tests/config/responsiveSuiteTargets.json`

Every target listed in this file must exist as a real test file in `apps/web`.
The list must remain a unique, non-empty array of `.ts`/`.tsx` file paths.

Quick run for this focused suite:

- Workspace root: `pnpm test:responsive`
- Web app only: `pnpm --filter web run test:responsive`

## Browser E2E (Playwright)

Critical browser user-flow coverage lives in `apps/web/tests/e2e` and includes:

- register/login
- access token refresh + logout + logout-all
- projects list -> project detail flow

Install browser locally:

```bash
pnpm --filter web run e2e:install
```

Run browser E2E locally (requires PostgreSQL and valid API env):

```bash
DATABASE_URL=postgresql://test:test@127.0.0.1:5432/mdsystem_test \
JWT_SECRET=test-jwt-secret-for-local-e2e \
API_KEY_ENCRYPTION_SECRET=test-api-key-secret-for-local-e2e-12345 \
CROSSREF_MAILTO=test@example.com \
pnpm --filter web run e2e
```

## Operations runbooks

- DB and deploy safety: `deploy/DB_RUNBOOK.md`
- Observability and alerting: `deploy/OBSERVABILITY_RUNBOOK.md`
- JWT rotation protocol: `deploy/JWT_ROTATION_RUNBOOK.md`
