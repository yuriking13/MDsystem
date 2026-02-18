# Playwright browser E2E

Critical browser scenarios are covered here:

- register/login
- token refresh/logout/logout-all
- projects list -> project detail

## Local run

1. Ensure PostgreSQL is available.
2. Install browser binaries:

```bash
pnpm --filter web run e2e:install
```

3. Run suite:

```bash
DATABASE_URL=postgresql://test:test@127.0.0.1:5432/mdsystem_test \
JWT_SECRET=test-jwt-secret-for-local-e2e \
API_KEY_ENCRYPTION_SECRET=test-api-key-secret-for-local-e2e-12345 \
CROSSREF_MAILTO=test@example.com \
pnpm --filter web run e2e
```

Playwright config starts API and WEB servers automatically.
