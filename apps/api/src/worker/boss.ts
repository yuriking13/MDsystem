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
  startPromise = b.start().then(() => {
    console.log('[pg-boss] Started successfully');
    return b;
  }).catch((err) => {
    console.error('[pg-boss] Failed to start:', err);
    startPromise = null;
    throw err;
  });

  return startPromise;
}
