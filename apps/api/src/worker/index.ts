import { startBoss } from './boss.js';
import { runPubmedSearchJob } from './jobs/pubmedSearchJob.js';
import { runGraphFetchJob } from './jobs/graphFetchJob.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('workers');

export async function startWorkers() {
  log.info('Starting workers...');
  const boss = await startBoss();
  log.info('pg-boss started, registering job handlers...');

  // PubMed search worker (1 concurrent)
  // Note: pg-boss 10.x passes an array of jobs to the handler
  log.debug('Registering search:pubmed handler');
  await boss.work('search:pubmed', async ([job]: any) => {
    log.info('Processing PubMed search job', { jobId: job.id });
    await runPubmedSearchJob(job.data as any);
  });
  log.debug('search:pubmed handler registered');

  // Graph fetch worker (1 concurrent для rate limiting)
  // Note: pg-boss 10.x passes an array of jobs to the handler
  log.debug('Registering graph:fetch-references handler');
  await boss.work('graph:fetch-references', async ([job]: any) => {
    log.info('Processing graph fetch job', { jobId: job.id });
    await runGraphFetchJob(job.data as any);
  });
  log.debug('graph:fetch-references handler registered');

  boss.on('error', (err) => {
    log.error('pg-boss error', err);
  });

  log.info('All workers started successfully');
}
