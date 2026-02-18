import { createLogger } from "./utils/logger.js";
import {
  captureBackendException,
  initializeObservability,
  shutdownObservability,
} from "./observability/index.js";

const log = createLogger("bootstrap");

try {
  await initializeObservability();
  await import("./server.js");
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  captureBackendException(err, {
    component: "bootstrap",
    mechanism: "startup",
  });
  log.error("Failed to bootstrap API process", err);
  await shutdownObservability();
  process.exit(1);
}
