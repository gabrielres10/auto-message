import { Worker } from "bullmq";
import type { SendMessageJobData, DLQJobData } from "@auto-message/shared";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { createRedisConnection } from "../lib/redis";
import { dlqQueue } from "../queues/dlq.queue";
import { QUEUE_NAMES } from "../queues/names";
import { getWhatsAppClient } from "../whatsapp/client";

export function createSenderWorker() {
  const worker = new Worker<SendMessageJobData>(
    QUEUE_NAMES.SENDER,
    async (job) => {
      const { executionId, scheduledMessageId, phoneNumber, body } = job.data;
      const log = logger.child({
        jobId: job.id,
        executionId,
        scheduledMessageId,
        attempt: job.attemptsMade + 1,
      });

      log.info("Processing send job");

      // Deduplication safety net — skip if a previous attempt already delivered.
      const exec = await db.messageExecution.findUnique({
        where: { id: executionId },
        select: { status: true },
      });
      if (exec?.status === "SENT") {
        log.warn("Already SENT — skipping duplicate");
        return;
      }

      await db.messageExecution.update({
        where: { id: executionId },
        data: {
          status: "PROCESSING",
          startedAt: new Date(),
          attempt: job.attemptsMade + 1,
        },
      });

      const client = getWhatsAppClient();
      const response = await client.sendMessage(`${phoneNumber}@c.us`, body);

      await db.messageExecution.update({
        where: { id: executionId },
        data: {
          status: "SENT",
          completedAt: new Date(),
          responseData: {
            messageId: response.id._serialized,
            timestamp: response.timestamp,
          },
        },
      });

      // Update parent message counters; mark ONCE messages as COMPLETED.
      const parent = await db.scheduledMessage.findUnique({
        where: { id: scheduledMessageId },
        select: { recurrenceType: true },
      });

      await db.scheduledMessage.update({
        where: { id: scheduledMessageId },
        data: {
          lastRunAt: new Date(),
          totalExecutions: { increment: 1 },
          ...(parent?.recurrenceType === "ONCE" ? { status: "COMPLETED" } : {}),
        },
      });

      log.info({ responseId: response.id._serialized }, "Message sent");
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // respect WhatsApp rate limits
    },
  );

  // Runs after every failure — including retryable ones.
  worker.on("failed", (job, err) => {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    const isExhausted = job.attemptsMade >= maxAttempts;
    const { executionId, scheduledMessageId } = job.data;

    if (!isExhausted) {
      logger.warn(
        { jobId: job.id, executionId, attempt: job.attemptsMade, maxAttempts, err: err.message },
        "Send attempt failed — will retry",
      );
      // Mark RETRYING so the dashboard can show meaningful state.
      void db.messageExecution.update({
        where: { id: executionId },
        data: { status: "RETRYING", errorMessage: err.message },
      });
      return;
    }

    // All attempts exhausted — move to dead-letter queue.
    logger.error(
      { jobId: job.id, executionId, scheduledMessageId, attempts: job.attemptsMade, err: err.message },
      "Job exhausted retries — moving to DLQ",
    );

    void db.messageExecution
      .update({
        where: { id: executionId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: err.message,
        },
      })
      .then(() =>
        dlqQueue.add("dlq-entry", {
          originalJobId: job.id,
          executionId,
          scheduledMessageId,
          failedAt: new Date().toISOString(),
          finalError: err.message,
          attemptsMade: job.attemptsMade,
        } satisfies DLQJobData),
      )
      .catch((dlqErr: unknown) =>
        logger.error({ dlqErr, executionId }, "Failed to write to DLQ"),
      );
  });

  return worker;
}
