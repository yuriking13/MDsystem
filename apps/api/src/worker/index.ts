import { startBoss, stopBoss } from "./boss.js";
import { runPubmedSearchJob } from "./jobs/pubmedSearchJob.js";
import { runGraphFetchJob } from "./jobs/graphFetchJob.js";
import { runEmbeddingsJob } from "./jobs/embeddingsJob.js";
import { createLogger } from "../utils/logger.js";
import {
  isPubmedSearchPayload,
  isGraphFetchPayload,
  isEmbeddingsJobPayload,
} from "./types.js";

const log = createLogger("workers");

let workersStarted = false;

export async function startWorkers() {
  if (workersStarted) {
    log.warn("Workers already started, skipping...");
    return;
  }
  workersStarted = true;
  log.info("Starting workers...");
  const boss = await startBoss();
  log.info("pg-boss started, registering job handlers...");

  // PubMed search worker (1 concurrent)
  // Note: pg-boss 10.x passes an array of jobs to the handler
  log.debug("Registering search:pubmed handler");
  await boss.work("search:pubmed", async ([job]) => {
    log.info("Processing PubMed search job", { jobId: job.id });
    if (!isPubmedSearchPayload(job.data)) {
      log.error("Invalid PubMed search job payload", undefined, {
        jobId: job.id,
        data: job.data,
      });
      return;
    }
    await runPubmedSearchJob(job.data);
  });
  log.debug("search:pubmed handler registered");

  // Graph fetch worker (1 concurrent для rate limiting)
  // Note: pg-boss 10.x passes an array of jobs to the handler
  log.debug("Registering graph:fetch-references handler");
  await boss.work("graph:fetch-references", async ([job]) => {
    log.info("Processing graph fetch job", { jobId: job.id });
    if (!isGraphFetchPayload(job.data)) {
      log.error("Invalid graph fetch job payload", undefined, {
        jobId: job.id,
        data: job.data,
      });
      return;
    }
    await runGraphFetchJob(job.data);
  });
  log.debug("graph:fetch-references handler registered");

  // Embeddings generation worker (1 concurrent для rate limiting OpenRouter)
  log.debug("Registering embeddings:generate handler");
  await boss.work("embeddings:generate", async ([job]) => {
    log.info("Processing embeddings job", { jobId: job.id });
    if (!isEmbeddingsJobPayload(job.data)) {
      log.error("Invalid embeddings job payload", undefined, {
        jobId: job.id,
        data: job.data,
      });
      return;
    }
    await runEmbeddingsJob(job.data);
  });
  log.debug("embeddings:generate handler registered");

  boss.on("error", (err) => {
    log.error("pg-boss error", err);
  });

  log.info("All workers started successfully");
}

export async function stopWorkers() {
  if (!workersStarted) {
    log.debug("Workers not started, nothing to stop");
    return;
  }

  log.info("Stopping workers...");
  try {
    await stopBoss();
    workersStarted = false;
    log.info("Workers stopped successfully");
  } catch (error) {
    log.error(
      "Error stopping workers",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}
