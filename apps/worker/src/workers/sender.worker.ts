import { Worker } from "bullmq";
import type { SendMessageJobData, DLQJobData } from "@auto-message/shared";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { createRedisConnection } from "../lib/redis";
import { dlqQueue } from "../queues/dlq.queue";
import { QUEUE_NAMES } from "../queues/names";
import { sendWhatsAppMessage } from "../whatsapp/sender";

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

      // Deduplication safety net: a previous attempt may have already succeeded.
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

      // sendWhatsAppMessage throws UnrecoverableError for invalid numbers
      // (no retry) and a regular Error for transient failures (retried by BullMQ).
      const { messageId, timestamp } = await sendWhatsAppMessage(
        phoneNumber,
        body,
      );

      await db.messageExecution.update({
        where: { id: executionId },
        data: {
          status: "SENT",
          completedAt: new Date(),
          responseData: { messageId, timestamp },
        },
      });

      // Mark ONCE messages COMPLETED; increment counters on all.
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

      log.info({ messageId }, "Message sent successfully");
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // WhatsApp enforces rate limits; keep sequential
    },
  );

  // ── Failure handler ─────────────────────────────────────────────────────────
  worker.on("failed", (job, err) => {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    const isExhausted = job.attemptsMade >= maxAttempts;
    const { executionId, scheduledMessageId } = job.data;
    const log = logger.child({ jobId: job.id, executionId, scheduledMessageId });

    if (!isExhausted) {
      log.warn(
        { attempt: job.attemptsMade, maxAttempts, err: err.message },
        "Send attempt failed — will retry",
      );
      void db.messageExecution.update({
        where: { id: executionId },
        data: { status: "RETRYING", errorMessage: err.message },
      });
      return;
    }

    // All attempts exhausted (or UnrecoverableError) — persist and move to DLQ.
    log.error(
      { attempts: job.attemptsMade, err: err.message },
      "Job exhausted — moving to DLQ",
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
        log.error({ dlqErr }, "Failed to write to DLQ"),
      );
  });

  return worker;
}
