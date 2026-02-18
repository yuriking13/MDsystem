import * as Sentry from "@sentry/react";

type FrontendErrorContext = {
  component?: string;
  route?: string;
  userId?: string;
  extra?: Record<string, unknown>;
};

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const sentryEnabled =
  Boolean(sentryDsn) && import.meta.env.VITE_SENTRY_ENABLED !== "false";
let sentryInitialized = false;

function parseSampleRate(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
    return fallback;
  }
  return numeric;
}

export function initFrontendObservability(): boolean {
  if (sentryInitialized) {
    return sentryEnabled;
  }

  if (!sentryEnabled || !sentryDsn) {
    return false;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
      0,
    ),
    sendDefaultPii: false,
  });
  sentryInitialized = true;
  return true;
}

export function captureFrontendException(
  error: unknown,
  context?: FrontendErrorContext,
): void {
  if (!sentryEnabled || !sentryInitialized) {
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.withScope((scope) => {
    if (context?.component) {
      scope.setTag("component", context.component);
    }
    if (context?.route || typeof window !== "undefined") {
      scope.setTag("route", context?.route || window.location.pathname);
    }
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context?.extra && Object.keys(context.extra).length > 0) {
      scope.setContext("extra", context.extra);
    }
    Sentry.captureException(err);
  });
}

export function isFrontendSentryEnabled(): boolean {
  return sentryEnabled;
}
