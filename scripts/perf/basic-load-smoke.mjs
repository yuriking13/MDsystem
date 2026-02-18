#!/usr/bin/env node
import { performance } from "node:perf_hooks";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const DURATION_SEC = Number(process.env.DURATION_SEC || 20);
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);
const PATHS = (process.env.PATHS || "/api/health")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

if (!Number.isFinite(DURATION_SEC) || DURATION_SEC <= 0) {
  console.error("DURATION_SEC must be a positive number");
  process.exit(2);
}

if (!Number.isFinite(CONCURRENCY) || CONCURRENCY <= 0) {
  console.error("CONCURRENCY must be a positive number");
  process.exit(2);
}

if (PATHS.length === 0) {
  console.error("PATHS must contain at least one endpoint path");
  process.exit(2);
}

const latenciesMs = [];
let success = 0;
let failed = 0;

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((p / 100) * sorted.length)),
  );
  return sorted[idx];
}

async function worker(workerId, deadlineMs) {
  let pathIdx = workerId % PATHS.length;

  while (Date.now() < deadlineMs) {
    const path = PATHS[pathIdx % PATHS.length];
    pathIdx += 1;

    const started = performance.now();
    try {
      const response = await fetch(`${BASE_URL}${path}`);
      const latency = performance.now() - started;
      latenciesMs.push(latency);
      if (response.ok) {
        success += 1;
      } else {
        failed += 1;
      }
      await response.arrayBuffer().catch(() => undefined);
    } catch {
      const latency = performance.now() - started;
      latenciesMs.push(latency);
      failed += 1;
    }
  }
}

const deadlineMs = Date.now() + DURATION_SEC * 1000;
const workers = Array.from({ length: CONCURRENCY }, (_, idx) =>
  worker(idx, deadlineMs),
);

await Promise.all(workers);

const total = success + failed;
const errorRate = total > 0 ? failed / total : 1;
const p50 = percentile(latenciesMs, 50);
const p95 = percentile(latenciesMs, 95);
const p99 = percentile(latenciesMs, 99);

console.log(
  JSON.stringify(
    {
      baseUrl: BASE_URL,
      durationSec: DURATION_SEC,
      concurrency: CONCURRENCY,
      paths: PATHS,
      totalRequests: total,
      ok: success,
      failed,
      errorRate: Number((errorRate * 100).toFixed(2)),
      latencyMs: {
        p50: Number(p50.toFixed(2)),
        p95: Number(p95.toFixed(2)),
        p99: Number(p99.toFixed(2)),
      },
    },
    null,
    2,
  ),
);

// Basic smoke threshold: fail only on high error rate.
if (errorRate > 0.05) {
  process.exit(1);
}
