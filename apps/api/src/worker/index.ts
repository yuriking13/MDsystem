import { startBoss, getBoss } from './boss.js';
import { runPubmedSearchJob } from './jobs/pubmedSearchJob.js';

export async function startWorkers() {
  const boss = await startBoss();

  // PubMed search worker (1 concurrent)
  await boss.work('search:pubmed', async (job: any) => {
    await runPubmedSearchJob(job.data as any);
  });

  boss.on('error', (err) => {
    console.error('[pg-boss error]', err);
  });

  console.log('Workers started');
}
