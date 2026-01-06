import { startBoss, getBoss } from './boss.js';
import { runPubmedSearchJob } from './jobs/pubmedSearchJob.js';
import { runGraphFetchJob } from './jobs/graphFetchJob.js';

export async function startWorkers() {
  const boss = await startBoss();

  // PubMed search worker (1 concurrent)
  await boss.work('search:pubmed', async (job: any) => {
    await runPubmedSearchJob(job.data as any);
  });

  // Graph fetch worker (1 concurrent для rate limiting)
  await boss.work('graph:fetch-references', async (job: any) => {
    await runGraphFetchJob(job.data as any);
  });

  boss.on('error', (err) => {
    console.error('[pg-boss error]', err);
  });

  console.log('Workers started');
}

