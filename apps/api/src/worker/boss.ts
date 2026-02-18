import PgBoss from "pg-boss";
import { env } from "../env.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("pg-boss");

let boss: PgBoss | null = null;
let startPromise: Promise<PgBoss> | null = null;
let monitorListenerAttached = false;

const BOSS_RETENTION = {
  archiveCompletedAfterSeconds: 60 * 60 * 24, // 24h
  archiveFailedAfterSeconds: 60 * 60 * 24, // 24h before archive
  deleteAfterDays: 30, // Keep archived jobs for observability/audit
  monitorStateIntervalMinutes: 1,
} as const;

// Queue names used in the application
const QUEUES = [
  "search:pubmed",
  "graph:fetch-references",
  "embeddings:generate",
] as const;

export function getBoss(): PgBoss {
  if (!boss) {
    log.info('Creating new PgBoss instance with schema "boss"');
    boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: "boss",
      // Let pg-boss manage its own schema - it will create tables on start()
      // if they don't exist or migrate them if needed
      archiveCompletedAfterSeconds: BOSS_RETENTION.archiveCompletedAfterSeconds,
      archiveFailedAfterSeconds: BOSS_RETENTION.archiveFailedAfterSeconds,
      deleteAfterDays: BOSS_RETENTION.deleteAfterDays,
      monitorStateIntervalMinutes: BOSS_RETENTION.monitorStateIntervalMinutes,
    });
    log.info("pg-boss retention policy configured", BOSS_RETENTION);
  }
  return boss;
}

export async function startBoss(): Promise<PgBoss> {
  // Avoid multiple concurrent start attempts
  if (startPromise) {
    return startPromise;
  }

  const b = getBoss();
  startPromise = (async () => {
    try {
      log.debug("Calling start()...");
      await b.start();
      log.info("Started successfully");

      if (!monitorListenerAttached) {
        b.on("monitor-states", (states) => {
          if (states.failed > 0) {
            log.warn("pg-boss has failed jobs", {
              failed: states.failed,
              retry: states.retry,
              active: states.active,
              completed: states.completed,
            });
          }
        });
        monitorListenerAttached = true;
      }

      // Create queues (required in pg-boss 10.x before sending jobs)
      for (const queue of QUEUES) {
        try {
          await b.createQueue(queue);
          log.debug(`Queue "${queue}" created/verified`);
        } catch (err) {
          // Queue might already exist - that's OK
          if (err instanceof Error && !err.message.includes("already exists")) {
            log.warn(`Warning creating queue "${queue}"`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      return b;
    } catch (err) {
      log.error("Failed to start", err);
      startPromise = null;
      throw err;
    }
  })();

  return startPromise;
}

export async function stopBoss(): Promise<void> {
  if (!boss) {
    log.debug("No boss instance to stop");
    return;
  }

  log.info("Stopping pg-boss...");
  try {
    await boss.stop({ graceful: true, timeout: 10000 });
    log.info("pg-boss stopped gracefully");
  } catch (err) {
    log.error("Error stopping pg-boss", err);
    throw err;
  } finally {
    boss = null;
    startPromise = null;
    monitorListenerAttached = false;
  }
}
