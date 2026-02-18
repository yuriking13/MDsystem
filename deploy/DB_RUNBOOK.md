# Database Deploy Runbook (Adminer-first)

This project keeps a manual database workflow. Deploy **must not** require
`prisma migrate` at runtime.

## Modes in `.github/workflows/deploy.yml`

- **Default (safe/manual):**
  - `ENABLE_PRISMA_DB_PUSH` is not set (or `false`)
  - workflow generates a Prisma schema diff and **skips** `prisma db push`
- **Optional auto-apply:**
  - set `ENABLE_PRISMA_DB_PUSH=true`
  - for destructive changes, also set `ALLOW_DESTRUCTIVE_DB_PUSH=true`

If potentially destructive SQL is detected (`DROP/TRUNCATE/...`) and
`ALLOW_DESTRUCTIVE_DB_PUSH` is not `true`, deploy fails fast.

## Pre-deploy checklist

1. Confirm current DB backup/snapshot exists.
2. Generate and review SQL diff:

   ```bash
   pnpm --filter api exec prisma migrate diff \
     --from-url "$DATABASE_URL" \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma-diff.sql
   ```

3. Check `prisma-diff.sql` for destructive statements:
   - `DROP TABLE`
   - `DROP COLUMN`
   - `TRUNCATE TABLE`
   - `ALTER TABLE ... DROP CONSTRAINT`
4. If destructive SQL is present:
   - plan rollback first
   - execute in maintenance window
   - require explicit approval before setting
     `ALLOW_DESTRUCTIVE_DB_PUSH=true`

## Manual Adminer execution order

Run SQL scripts manually in Adminer when needed:

1. `apps/api/prisma/migrations/reset_boss_schema.sql`
2. `apps/api/prisma/migrations/drop_admin_views.sql`
3. `apps/api/prisma/migrations/add_project_files.sql`
4. `apps/api/prisma/migrations/add_file_extracted_metadata.sql`
5. `apps/api/prisma/migrations/fix_admin_user.sql`
6. `apps/api/prisma/migrations/add_user_blocking.sql`
7. `apps/api/prisma/migrations/add_project_settings.sql`
8. `apps/api/prisma/migrations/add_auto_graph_sync_setting.sql`
9. `apps/api/prisma/migrations/add_semantic_search.sql`
10. `apps/api/prisma/migrations/add_semantic_clusters.sql`
11. `apps/api/prisma/migrations/add_embedding_jobs.sql`
12. `apps/api/prisma/migrations/add_refresh_tokens.sql`

## Post-deploy validation

1. `/api/health` responds with HTTP 200
2. API login/refresh flow works
3. Admin panel works (`/api/admin/me`)
4. No Prisma schema drift warnings in logs
