import PgBoss from 'pg-boss';
import { env } from '../env.js';

let boss: PgBoss | null = null;
let startPromise: Promise<PgBoss> | null = null;

// Queue names used in the application
const QUEUES = ['search:pubmed', 'graph:fetch-references'] as const;

export function getBoss(): PgBoss {
  if (!boss) {
    console.log('[pg-boss] Creating new PgBoss instance with schema "boss"');
    boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: 'boss',
      // Let pg-boss manage its own schema - it will create tables on start()
      // if they don't exist or migrate them if needed
      archiveCompletedAfterSeconds: 60 * 60 * 24,
      deleteAfterSeconds: 60 * 60 * 24 * 7,
    });
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
      console.log('[pg-boss] Calling start()...');
      await b.start();
      console.log('[pg-boss] Started successfully');
      
      // Create queues (required in pg-boss 10.x before sending jobs)
      for (const queue of QUEUES) {
        try {
          await b.createQueue(queue);
          console.log(`[pg-boss] Queue "${queue}" created/verified`);
        } catch (err) {
          // Queue might already exist - that's OK
          if (err instanceof Error && !err.message.includes('already exists')) {
            console.warn(`[pg-boss] Warning creating queue "${queue}":`, err.message);
          }
        }
      }
      
      return b;
    } catch (err) {
      console.error('[pg-boss] Failed to start:', err instanceof Error ? err.message : String(err));
      if (err instanceof Error && err.stack) {
        console.error('[pg-boss] Stack:', err.stack);
      }
      startPromise = null;
      throw err;
    }
  })();

  return startPromise;
}
