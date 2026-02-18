import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import * as Sentry from "@sentry/node";
import { env } from "../env.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("observability");

let sentryEnabled = false;
let otelEnabled = false;
let otelSdk: NodeSDK | null = null;
let processHandlersRegistered = false;
let uncaughtMonitorHandler: ((error: Error) => void) | null = null;
let unhandledRejectionHandler: ((reason: unknown) => void) | null = null;

export type RequestErrorContext = {
  requestId: string;
  route: string;
  method: string;
  statusCode: number;
  userId?: string;
};

type CaptureContext = {
  component?: string;
  mechanism?: string;
} & Partial<RequestErrorContext>;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function normalizeOtelTraceEndpoint(endpoint: string): string {
  const trimmed = endpoint.replace(/\/+$/, "");
  return trimmed.endsWith("/v1/traces") ? trimmed : `${trimmed}/v1/traces`;
}

function parseOtelHeaders(
  rawHeaders?: string,
): Record<string, string> | undefined {
  if (!rawHeaders) {
    return undefined;
  }

  const parsedHeaders: Record<string, string> = {};
  const pairs = rawHeaders.split(",");
  for (const pair of pairs) {
    const [rawKey, ...rawValueParts] = pair.split("=");
    const key = rawKey?.trim();
    const value = rawValueParts.join("=").trim();
    if (!key || !value) {
      continue;
    }
    parsedHeaders[key] = value;
  }

  return Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined;
}

function applySentryScopeContext(
  scope: Sentry.Scope,
  context?: CaptureContext,
): void {
  if (!context) {
    return;
  }

  if (context.component) {
    scope.setTag("component", context.component);
  }
  if (context.mechanism) {
    scope.setTag("mechanism", context.mechanism);
  }
  if (context.route) {
    scope.setTag("route", context.route);
  }
  if (context.method) {
    scope.setTag("method", context.method);
  }
  if (context.statusCode !== undefined) {
    scope.setTag("status_code", String(context.statusCode));
  }

  if (context.userId) {
    scope.setUser({ id: context.userId });
  }

  if (context.requestId || context.route || context.method) {
    scope.setContext("request", {
      requestId: context.requestId,
      route: context.route,
      method: context.method,
      statusCode: context.statusCode,
      userId: context.userId,
    });
  }
}

function registerGlobalErrorHandlers(): void {
  if (processHandlersRegistered || !sentryEnabled) {
    return;
  }

  if (!uncaughtMonitorHandler) {
    uncaughtMonitorHandler = (error: Error) => {
      captureBackendException(error, {
        component: "process",
        mechanism: "uncaughtExceptionMonitor",
      });
    };
    process.on("uncaughtExceptionMonitor", uncaughtMonitorHandler);
  }

  if (!unhandledRejectionHandler) {
    unhandledRejectionHandler = (reason: unknown) => {
      captureBackendException(reason, {
        component: "process",
        mechanism: "unhandledRejection",
      });
    };
    process.on("unhandledRejection", unhandledRejectionHandler);
  }

  processHandlersRegistered = true;
}

function initSentry(): void {
  if (!env.SENTRY_DSN) {
    log.info("Sentry is disabled (SENTRY_DSN is not set)");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
  });
  sentryEnabled = true;
  log.info("Sentry initialized", {
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    release: env.SENTRY_RELEASE || "n/a",
  });
}

async function initOpenTelemetry(): Promise<void> {
  if (!env.OTEL_ENABLED) {
    log.info("OpenTelemetry is disabled (OTEL_ENABLED=false)");
    return;
  }

  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    log.info(
      "OpenTelemetry is disabled (OTEL_EXPORTER_OTLP_ENDPOINT is not set)",
    );
    return;
  }

  try {
    if (!process.env.OTEL_SERVICE_NAME) {
      process.env.OTEL_SERVICE_NAME = env.OTEL_SERVICE_NAME;
    }
    if (!process.env.OTEL_TRACES_SAMPLER) {
      process.env.OTEL_TRACES_SAMPLER = "traceidratio";
    }
    if (!process.env.OTEL_TRACES_SAMPLER_ARG) {
      process.env.OTEL_TRACES_SAMPLER_ARG = String(
        env.OTEL_TRACES_SAMPLE_RATIO,
      );
    }

    otelSdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({
        url: normalizeOtelTraceEndpoint(env.OTEL_EXPORTER_OTLP_ENDPOINT),
        headers: parseOtelHeaders(env.OTEL_EXPORTER_OTLP_HEADERS),
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-http": { enabled: true },
          "@opentelemetry/instrumentation-fastify": { enabled: true },
          "@opentelemetry/instrumentation-pg": { enabled: true },
          "@opentelemetry/instrumentation-undici": { enabled: true },
        }),
      ],
    });

    await otelSdk.start();
    otelEnabled = true;
    log.info("OpenTelemetry tracing initialized", {
      serviceName: process.env.OTEL_SERVICE_NAME,
      endpoint: normalizeOtelTraceEndpoint(env.OTEL_EXPORTER_OTLP_ENDPOINT),
      samplerRatio: Number(process.env.OTEL_TRACES_SAMPLER_ARG),
    });
  } catch (error) {
    otelEnabled = false;
    otelSdk = null;
    log.error(
      "Failed to initialize OpenTelemetry; continuing with tracing disabled",
      toError(error),
    );
  }
}

export async function initializeObservability(): Promise<void> {
  initSentry();
  registerGlobalErrorHandlers();
  await initOpenTelemetry();
}

export function captureBackendException(
  error: unknown,
  context?: CaptureContext,
): void {
  if (!sentryEnabled) {
    return;
  }

  const err = toError(error);
  Sentry.withScope((scope) => {
    applySentryScopeContext(scope, context);
    Sentry.captureException(err);
  });
}

export function captureBackendRequestException(
  error: unknown,
  context: RequestErrorContext,
): void {
  captureBackendException(error, {
    ...context,
    component: "http-request",
    mechanism: "fastify-error-handler",
  });
}

export async function shutdownObservability(timeoutMs = 2000): Promise<void> {
  if (otelSdk) {
    try {
      await otelSdk.shutdown();
      log.info("OpenTelemetry SDK shutdown completed");
    } catch (error) {
      log.error("Failed to shutdown OpenTelemetry SDK", toError(error));
    } finally {
      otelSdk = null;
      otelEnabled = false;
    }
  }

  if (sentryEnabled) {
    try {
      await Sentry.flush(timeoutMs);
      log.info("Sentry buffer flushed");
    } catch (error) {
      log.error("Failed to flush Sentry buffer", toError(error));
    }
  }
}

export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

export function isOtelEnabled(): boolean {
  return otelEnabled;
}
