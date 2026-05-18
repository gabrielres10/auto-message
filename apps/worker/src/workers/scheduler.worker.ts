import { Worker } from "bullmq";
import type { ScheduledMessage, RecurrenceRule } from "@prisma/client";
import type { SchedulerTickJobData } from "@auto-message/shared";
import { computeNextRunAt, isWithinBounds } from "@auto-message/shared";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { createRedisConnection } from "../lib/redis";
import { senderQueue } from "../queues/sender.queue";
import { QUEUE_NAMES } from "../queues/names";

type MsgWithRule = ScheduledMessage & { recurrenceRule: RecurrenceRule | null };

/** Scan this far ahead for due messages on each tick. */
const LOOKAHEAD_MS = 2 * 60 * 1_000; // 2 minutes

export function createSchedulerWorker() {
  const worker = new Worker<SchedulerTickJobData>(
    QUEUE_NAMES.SCHEDULER,
    async () => {
      const now = new Date();
      const cutoff = new Date(now.getTime() + LOOKAHEAD_MS);

      const messages = await db.scheduledMessage.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          status: "ACTIVE",
          nextRunAt: { not: null, lte: cutoff },
        },
        include: { recurrenceRule: true },
      });

      logger.info({ count: messages.length }, "Scheduler tick");

      for (const msg of messages) {
        try {
          await enqueueMessage(msg as MsgWithRule);
        } catch (err) {
          logger.error({ err, messageId: msg.id }, "Failed to enqueue message");
        }
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // single-threaded scan prevents duplicate scheduling
    },
  );

  worker.on("failed", (_job, err) =>
    logger.error({ err }, "Scheduler worker job failed"),
  );

  return worker;
}

async function enqueueMessage(msg: MsgWithRule): Promise<void> {
  const scheduledFor = msg.nextRunAt!;
  const log = logger.child({ messageId: msg.id, scheduledFor });

  // Deduplication: skip if a non-cancelled execution already exists for this fire time.
  const existing = await db.messageExecution.findFirst({
    where: {
      scheduledMessageId: msg.id,
      scheduledFor,
      status: { notIn: ["CANCELLED"] },
    },
  });

  if (existing) {
    log.warn({ executionId: existing.id }, "Execution already exists — skipping");
    return;
  }

  const now = new Date();

  const execution = await db.messageExecution.create({
    data: {
      scheduledMessageId: msg.id,
      scheduledFor,
      status: "QUEUED",
      queuedAt: now,
    },
  });

  const jobId = `send:${execution.id}`;
  const delayMs = Math.max(0, scheduledFor.getTime() - now.getTime());

  // job ID acts as deduplication key — BullMQ silently drops jobs with
  // an ID that already exists in the queue.
  await senderQueue.add(
    "send-message",
    {
      executionId: execution.id,
      scheduledMessageId: msg.id,
      userId: msg.userId,
      phoneNumber: msg.phoneNumber,
      body: msg.body,
      scheduledFor: scheduledFor.toISOString(),
      timezone: msg.timezone,
    },
    { jobId, delay: delayMs },
  );

  await db.messageExecution.update({
    where: { id: execution.id },
    data: { jobId },
  });

  // Advance nextRunAt before the job fires so the next tick never double-schedules.
  const rule = msg.recurrenceRule;
  const isOnce = msg.recurrenceType === "ONCE" || !rule;
  const nextRunAt = isOnce
    ? null
    : computeNextRunAt(msg, rule, scheduledFor);
  const keeps = nextRunAt !== null && rule !== null && isWithinBounds(nextRunAt, rule);

  if (!keeps) {
    // Last occurrence — deactivate. The sender worker sets COMPLETED on delivery.
    await db.scheduledMessage.update({
      where: { id: msg.id },
      data: { isActive: false, nextRunAt: null },
    });
  } else {
    await Promise.all([
      db.scheduledMessage.update({
        where: { id: msg.id },
        data: { nextRunAt },
      }),
      db.recurrenceRule.update({
        where: { id: rule!.id },
        data: { occurrenceCount: { increment: 1 } },
      }),
    ]);
  }

  log.info({ executionId: execution.id, jobId, delayMs, nextRunAt }, "Enqueued");
}
