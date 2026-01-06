import { startBoss, getBoss } from './boss.js';
import { runPubmedSearchJob } from './jobs/pubmedSearchJob.js';
import { runGraphFetchJob } from './jobs/graphFetchJob.js';

export async function startWorkers() {
  console.log('[workers] Starting workers...');
  const boss = await startBoss();
  console.log('[workers] pg-boss started, registering job handlers...');

  // PubMed search worker (1 concurrent)
  // Note: pg-boss 10.x passes an array of jobs to the handler
  console.log('[workers] Registering search:pubmed handler');
  await boss.work('search:pubmed', async ([job]: any) => {
    console.log('[worker-pubmed] Processing job', job.id);
    await runPubmedSearchJob(job.data as any);
  });
  console.log('[workers] search:pubmed handler registered');

  // Graph fetch worker (1 concurrent для rate limiting)
  // Note: pg-boss 10.x passes an array of jobs to the handler
  console.log('[workers] Registering graph:fetch-references handler');
  await boss.work('graph:fetch-references', async ([job]: any) => {
    console.log('[worker-graph] Processing job', job.id);
    await runGraphFetchJob(job.data as any);
  });
  console.log('[workers] graph:fetch-references handler registered');

  boss.on('error', (err) => {
    console.error('[pg-boss error]', err);
  });

  console.log('[workers] All workers started successfully');
}

