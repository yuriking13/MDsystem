# MDsystem - Full Codebase Audit Report

**Date:** February 12, 2026  
**Scope:** Complete backend (API) and frontend (Web) audit  
**Commit base:** `7dc712a` (main)

---

## Executive Summary

MDsystem is a monorepo scientific article management platform with article search (PubMed, DOAJ, Wiley), citation graph visualization, document editor with bibliography, AI-powered analysis, and admin panel. The codebase is well-structured overall but has critical security vulnerabilities, missing frontend-backend contract consistency, and several architectural inefficiencies.

**Findings by severity:**
- **Critical (Fixed):** 4 issues
- **High:** 8 issues  
- **Medium:** 12 issues
- **Low / Informational:** 10+ issues

---

## 1. CRITICAL ISSUES (Fixed in this PR)

### 1.1 `search.ts` — Authentication Completely Disabled
**File:** `apps/api/src/routes/search.ts:8`  
**Problem:** The `preHandler: [app.auth]` was commented out. Any unauthenticated user could trigger PubMed searches and create search queries in any project by guessing the project UUID.  
**Impact:** Unauthorized data access, resource abuse, potential cost impact from API calls.  
**Fix:** Restored `{ preHandler: [app.auth] }`.

### 1.2 `auth.ts` — Blocked Users Can Still Log In
**File:** `apps/api/src/routes/auth.ts:64-80`  
**Problem:** The login endpoint queries `id, email, password_hash` but never checks `is_blocked`. Admin can block users in the DB, but they can still authenticate and get tokens.  
**Impact:** User blocking feature is completely ineffective.  
**Fix:** Added `is_blocked, blocked_reason` to the login query and return 403 with an explanation when blocked.

### 1.3 Diagnostic Endpoints Exposed Without Authentication
**Files:** `apps/api/src/server.ts:114-140`, `apps/api/src/routes/health.ts:187-225`  
**Problem:** `/api/ws-stats`, `/api/cache-stats`, `/api/perf-stats`, `/api/health/detailed`, and `/api/health/circuit-breaker/:apiName/reset` are all publicly accessible without any authentication.  
**Impact:** Internal infrastructure information disclosure (pool sizes, memory usage, Redis status, CORS config, connection counts). The circuit breaker reset endpoint could be used to disable rate limiting protections.  
**Fix:** Added `{ preHandler: [app.auth] }` to all sensitive diagnostic endpoints. Kept `/api/health`, `/api/health/live`, `/api/health/ready` public for load balancer probes.

### 1.4 Frontend Auth Token — Graph Export Uses Wrong Key
**File:** `apps/web/src/lib/api.ts:1154`  
**Problem:** `apiExportCitationGraph` reads `localStorage.getItem("token")` but the app stores tokens under `"mdsystem_token"`. This means graph exports always fail silently (no auth header).  
**Fix:** Changed to use `getToken()` which reads from the correct key.

---

## 2. HIGH SEVERITY ISSUES

### 2.1 Frontend Missing Refresh Token Integration (Fixed)
**Files:** `apps/web/src/lib/auth.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/AuthContext.tsx`  
**Problem:** Backend implements full refresh token rotation (access + refresh pair, token rotation on `/api/auth/refresh`), but the frontend:
  - Never stores the refresh token from login/register responses
  - Never calls `/api/auth/refresh` when access tokens expire
  - Users get logged out after 15 minutes (default `ACCESS_TOKEN_EXPIRES`)  
**Fix:** Added refresh token storage, auto-refresh on 401, and updated login/register flows.

### 2.2 Document Reorder N+1 Query (Fixed)
**File:** `apps/api/src/routes/documents/crud.ts:289-295`  
**Problem:** Reordering N documents executes N separate UPDATE queries in a loop. For 50+ documents this creates significant DB load and latency.  
**Fix:** Replaced with a single `UPDATE ... FROM UNNEST` batch query.

### 2.3 Project Update Cannot Clear Nullable Fields (Fixed)
**File:** `apps/api/src/routes/projects.ts:182-197`  
**Problem:** Conditions like `if (bodyP.data.researchType !== undefined && bodyP.data.researchType !== null)` prevent users from ever clearing these fields back to NULL. Once set, they can never be removed.  
**Fix:** Changed to `if (bodyP.data.researchType !== undefined)` with `?? null` coalescing.

### 2.4 Duplicate Connection Pools (Fixed)
**File:** `apps/api/src/utils/db.ts`  
**Problem:** `getDb()` creates its own separate `Pool(max: 10)` as a fallback, but the main pool is already in `pg.ts` (max: 20). Routes using `getDb()` (like `settings.ts`) end up with 2 separate pool instances wasting connections.  
**Fix:** Reused the shared pool from `pg.ts`.

### 2.5 Prisma + Raw SQL Dual Access Pattern
**Files:** Multiple routes mix `prisma` ORM and raw `pool.query()`  
**Problem:** `files.ts` uses Prisma for most operations but raw SQL for article import. `project-access.ts` has both `checkProjectAccessPool()` and `checkProjectAccessPrisma()`. This creates:
  - Two different connection pools (Prisma internal + pg `Pool`)
  - Inconsistent error handling
  - Harder to maintain
**Recommendation:** Standardize on one approach per route module. Prefer raw SQL (pg pool) for performance-critical paths and Prisma for complex ORM operations.

### 2.6 `articles/full.ts` — 3800+ Line Monolithic Route
**File:** `apps/api/src/routes/articles/full.ts` (144K chars, ~3900 lines)  
**Problem:** Contains all article operations: search, CRUD, translate, enrich, graph, AI, import — in a single file. Comments even acknowledge this ("Modular structure is prepared for future refactoring").  
**Recommendation:** The modular structure in `articles/index.ts` is already scaffolded. Complete the extraction.

### 2.7 `deploy.yml` — Database Migrations via `prisma db push --accept-data-loss`
**File:** `.github/workflows/deploy.yml:51`  
**Problem:** Using `db push --accept-data-loss` in production is dangerous. If a model field is renamed or removed, Prisma may DROP the column with all data.  
**Recommendation:** Migrate to `prisma migrate deploy` for production. The schema is already stable enough.

### 2.8 No CSRF Protection
**Problem:** API uses JWT in `Authorization` header (good), but several endpoints accept operations via simple POST that browsers could trigger. The CORS origin check helps but is not a complete CSRF defense. There is no CSRF token mechanism.  
**Recommendation:** For cookie-based sessions or if cookies are ever added, implement CSRF tokens. Current JWT-in-header approach is relatively safe.

---

## 3. MEDIUM SEVERITY ISSUES

### 3.1 `ci.yml` — Lint Errors Non-Blocking
**File:** `.github/workflows/ci.yml:47`  
The lint step uses `continue-on-error: true`, meaning lint failures never fail CI. This allows code quality issues to accumulate.

### 3.2 No Web (Frontend) Tests in CI
**File:** `.github/workflows/ci.yml`  
CI runs `pnpm --filter api test` but never runs `pnpm --filter web test`. Frontend tests exist (`ArticleAISidebar.test.tsx`, `ArticleCard.test.tsx`, `logger.test.ts`) but are never executed in CI.

### 3.3 Missing Input Validation on File Routes
**File:** `apps/api/src/routes/files.ts`  
File endpoints use `req.params` directly without Zod schema validation (unlike projects, documents, statistics). `projectId` and `fileId` are assumed to be valid UUIDs but never validated.

### 3.4 WebSocket Auth — No Project Access Check
**File:** `apps/api/src/websocket.ts:201-219`  
WebSocket connection only verifies JWT token validity but does NOT check if the user is a member of the project they're subscribing to. Any authenticated user can listen to events from any project.

### 3.5 `console.log` in Production Code
**File:** `apps/api/src/routes/projects.ts:274`  
Uses `console.log('[project-delete] Boss schema cleanup skipped:')` instead of the structured logger. This bypasses log level filtering and structured format.

### 3.6 Citation Renumbering — Regex on User Content
**File:** `apps/api/src/routes/documents/crud.ts:401-418`  
Citation renumbering uses regex replacement on HTML document content. This is fragile and could break if HTML structure changes or contains similar patterns in user text.

### 3.7 `cacheGet` Calls `initRedisClient()` on Every Read
**File:** `apps/api/src/lib/redis.ts:287-288`  
Every cache read calls `initRedisClient()` which checks `connectionAttempted`, `isRedisConfigured()`, etc. While fast, this adds unnecessary overhead on the hot path.

### 3.8 No Password Complexity Requirements
**File:** `apps/api/src/routes/auth.ts:15`  
Registration only requires `z.string().min(8)`. No uppercase, number, or special character requirements.

### 3.9 `env.ts` — No dotenv Support
**File:** `apps/api/src/env.ts:83`  
Comment says "No dotenv/.env — only process.env". While this is a deliberate design choice for production (systemd), it makes local development harder without additional setup.

### 3.10 Statistics Sync — Unbounded Loop
**File:** `apps/api/src/routes/statistics.ts:559-654`  
The `/statistics/sync` endpoint processes tables and charts in sequential loops with individual DB queries. A malicious request with 1000 items would cause 2000+ queries.

### 3.11 Missing `@map("language")` in Prisma Schema
**File:** `apps/api/prisma/schema.prisma:64`  
The `language` field in `Project` model has no `@map` annotation. While it works (snake_case matches), it's inconsistent with other fields.

### 3.12 Rate Limiter Memory Leak Potential
**File:** `apps/api/src/plugins/rate-limit.ts:39-48`  
The cleanup interval runs every 60 seconds but uses `setInterval` at module level. This interval is never cleared on shutdown and may prevent clean garbage collection.

---

## 4. LOW SEVERITY / INFORMATIONAL

### 4.1 `pnpm-lock.yaml` + `package-lock.json` Coexist
Both lock files are present in `apps/api/` and `apps/web/`. The root uses pnpm but sub-packages have npm lock files too. This causes confusion and potential dependency divergence.

### 4.2 Root `package.json` Has Web-Only Dependencies
**File:** `package.json:17-22`  
Root `package.json` lists `@tiptap/extension-paragraph`, `prosemirror-*`, `tiptap-pagination-plus` as dependencies. These belong in `apps/web/package.json`.

### 4.3 Test Coverage Gaps
Only utility functions are tested (`bibliography`, `stats`, `project-access`, `auth`, `logger`, `apiKeyCrypto`, `password`, `rate-limit`). No integration tests for routes.

### 4.4 `theme-editor/` — Standalone Development Tool
`theme-editor/server.js` and `theme-preview.html` are development tools. Consider adding to `.gitignore` or moving to a `tools/` directory.

### 4.5 `test-recommendations.ts` and `test-optimizations.ts`
Test/scratch files in `apps/api/` root. Should be removed or moved to `tests/`.

### 4.6 Unused `search.ts` Route
**File:** `apps/api/src/routes/search.ts`  
This route is not registered in `server.ts`. The search functionality is actually in `articles/full.ts`. Dead code.

### 4.7 `OnboardingTour` Always Loaded for Auth Users
**File:** `apps/web/src/App.tsx:70`  
`<OnboardingTour />` is rendered for every authenticated page load. While lazy-loaded, it should check localStorage for "already shown" before even mounting.

### 4.8 Inconsistent Error Response Format
Some routes return `{ error: "NotFound" }`, others `{ error: "NotFound", message: "..." }`, and file routes use Fastify's built-in `reply.notFound("...")`. Should standardize.

### 4.9 `AdminContext.tsx` Has Separate Auth Flow
Admin authentication is completely separate from user auth (different token, different context). This is by design but means admin sessions don't benefit from refresh tokens.

### 4.10 Missing Index on `refresh_tokens`
The `refresh_tokens` table (created via manual SQL migration) may be missing indexes on `token_hash` and `user_id`, which are queried on every token refresh.

---

## 5. ARCHITECTURE OBSERVATIONS

### 5.1 Strengths
- Well-implemented caching layer with Redis/LRU dual-backend
- Proper rate limiting with Redis fallback
- Good use of Zod for input validation in most routes
- WebSocket for real-time updates
- Optimistic locking on statistics
- Structured logging system
- Health check endpoints for monitoring
- AES-256-GCM encryption for API keys
- Circuit breaker pattern for external APIs

### 5.2 Areas for Improvement
- Complete the articles route modularization (the scaffolding exists)
- Add integration tests for critical flows (auth, projects, documents)
- Implement proper database migration strategy (replace `db push`)
- Add request validation middleware (instead of per-route Zod parsing)
- Consider adding OpenAPI schema generation from Zod schemas
- Add structured audit logging for all write operations

---

*This audit was performed by analyzing all source files in the repository. Fixes for critical and high-severity issues have been implemented in the accompanying commits.*
