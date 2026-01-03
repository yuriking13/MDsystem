import PgBoss from 'pg-boss';
import { env } from '../env.js';

let boss: PgBoss | null = null;

export function getBoss(): PgBoss {
  if (!boss) {
    boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: 'boss'
    });
  }
  return boss;
}

export async function startBoss(): Promise<PgBoss> {
  const b = getBoss();
  await b.start();
  return b;
}
