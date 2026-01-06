import PgBoss from 'pg-boss';
import { env } from '../env.js';

let boss: PgBoss | null = null;
let startPromise: Promise<PgBoss> | null = null;

export function getBoss(): PgBoss {
  if (!boss) {
    console.log('[pg-boss] Creating new PgBoss instance with schema "boss"');
    boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: 'boss',
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
