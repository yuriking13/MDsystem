# Observability Runbook (Sentry + OpenTelemetry + Alerts)

This runbook describes production observability for MDsystem API/WEB.

## 1) Backend Sentry

Enabled when `SENTRY_DSN` is set.

Required/optional env:

- `SENTRY_DSN` (required to enable)
- `SENTRY_ENVIRONMENT` (optional, defaults to `NODE_ENV`)
- `SENTRY_RELEASE` (optional, recommended: git SHA)
- `SENTRY_TRACES_SAMPLE_RATE` (optional, default `0`)

Behavior:

- Captures unhandled exceptions/rejections.
- Captures HTTP 5xx errors from Fastify global handler.
- Adds request context (`requestId`, `route`, `method`, `statusCode`, `userId`).

## 2) Frontend Sentry

Enabled when:

- `VITE_SENTRY_DSN` is set
- `VITE_SENTRY_ENABLED` is not `false`

Optional frontend env:

- `VITE_SENTRY_ENVIRONMENT`
- `VITE_SENTRY_RELEASE`
- `VITE_SENTRY_TRACES_SAMPLE_RATE` (default `0`)

Behavior:

- Runtime React errors are captured from `ErrorBoundary`.
- Existing `/api/errors/client` logging is kept (Sentry is additive).

### Sourcemaps/releases upload (optional)

Vite Sentry plugin uploads sourcemaps only if all are present:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_RELEASE`

Without these vars, build uses safe fallback (no upload, no sourcemaps).

## 3) OpenTelemetry (backend tracing)

Enabled only when all conditions match:

- `OTEL_ENABLED=true` (default true)
- `OTEL_EXPORTER_OTLP_ENDPOINT` is configured

Optional env:

- `OTEL_SERVICE_NAME` (default `thesis-api`)
- `OTEL_EXPORTER_OTLP_HEADERS` (comma-separated `key=value,key2=value2`)
- `OTEL_TRACES_SAMPLE_RATIO` (default `1`, range `0..1`)

Behavior:

- Safe no-op fallback when collector endpoint is missing.
- Tracing auto-instrumentation enabled for HTTP/Fastify/PG/external requests.

## 4) Alert rules

Rules file: `deploy/alerts/mdsystem-alerts.yml`

Installed to:

- `/etc/prometheus/rules/mdsystem-alerts.yml`

Loaded from:

- `/etc/prometheus/prometheus.yml` (`rule_files`)

Current production alerts:

- `MDSystemApiHigh5xxErrorRate`
- `MDSystemApiLatencyP95High`
- `MDSystemApiHealthDegraded`
- `MDSystemWorkersFailureDetected`
- `MDSystemWorkersBacklogHigh`
- `MDSystemMetricsScrapeTargetDown`
- `MDSystemMetricsCollectorErrors`

## 5) Operational checks after deploy

1. API health:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

2. Metrics endpoint (admin token or bearer scrape token):

```bash
curl -fsS -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" http://127.0.0.1:3000/metrics
```

3. Confirm health/worker metrics exist:

```bash
curl -fsS -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" http://127.0.0.1:3000/metrics \
  | rg "service_health_status|worker_queue_jobs|metrics_collector_errors_total"
```

4. Verify startup logs:

- Sentry enabled/disabled status
- OTel initialized or no-op fallback reason

## 6) Incident triage quick map

- High 5xx: inspect API logs + recent deploy + DB connectivity.
- High p95 latency: inspect DB pool, external API latency, queue backlog.
- Health degraded: inspect `service_health_status` labels and `/api/health`.
- Worker failures/backlog: inspect `graph_fetch_jobs`, `embedding_jobs`, worker logs.
- Scrape down: check API availability, `/metrics` auth token, Prometheus target status.
