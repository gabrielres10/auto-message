import { Worker } from "bullmq";
import type { DLQJobData } from "@auto-message/shared";
import { logger } from "../lib/logger";
import { createRedisConnection } from "../lib/redis";
import { QUEUE_NAMES } from "../queues/names";

/**
 * Dead-letter queue worker.
 *
 * Jobs arrive here after exhausting all sender retries. The execution record is
 * already marked FAILED by the sender worker. This worker's job is to surface
 * the failure in structured logs so it appears in dashboards and alerting, and
 * to keep the entries accessible for manual requeue via Bull Board or admin API.
 */
export function createDLQWorker() {
  const worker = new Worker<DLQJobData>(
    QUEUE_NAMES.DLQ,
    async (job) => {
      const { executionId, scheduledMessageId, finalError, attemptsMade, failedAt } =
        job.data;

      logger.error(
        { executionId, scheduledMessageId, finalError, attemptsMade, failedAt },
        "DEAD LETTER — manual intervention required",
      );
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    },
  );

  return worker;
}
