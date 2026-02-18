# Migration Versioning Policy

This repository uses manually applied SQL migrations in production.

## Naming

- Feature migration: `add_<feature>_vN.sql`
- Rollback pair: `rollback_<feature>_vN.sql`

`vN` must increase when the same feature evolves.

## Rules

1. Every new **critical** migration should have a rollback script.
2. Migration scripts must be idempotent (`IF NOT EXISTS`, guarded DDL).
3. Rollbacks should only revert objects created by the matching migration.
4. Deployment order in `deploy/DB_RUNBOOK.md` and `.github/workflows/deploy.yml`
   must be kept in sync.

## Current critical migration pair example

- `add_composite_indexes_v2.sql`
- `rollback_add_composite_indexes_v2.sql`
