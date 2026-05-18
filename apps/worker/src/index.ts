import "dotenv/config";
import type { Worker } from "bullmq";
import { logger } from "./lib/logger";
import { db } from "./lib/db";
import { initWhatsAppClient } from "./whatsapp/client";
import { schedulerQueue } from "./queues/scheduler.queue";
import { createSchedulerWorker } from "./workers/scheduler.worker";
import { createSenderWorker } from "./workers/sender.worker";
import { createDLQWorker } from "./workers/dlq.worker";

async function main() {
  logger.info("Starting auto-message worker");

  await initWhatsAppClient();

  const schedulerWorker = createSchedulerWorker();
  const senderWorker = createSenderWorker();
  const dlqWorker = createDLQWorker();

  // Register a repeatable tick that fires every minute.
  // upsertJobScheduler is idempotent — safe to call on every startup.
  await schedulerQueue.upsertJobScheduler(
    "scheduler-tick",
    { pattern: "* * * * *" },
    { name: "tick", data: {} },
  );

  logger.info("Workers running — scheduler tick registered (cron: every minute)");

  const workers: Worker[] = [schedulerWorker, senderWorker, dlqWorker];

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Graceful shutdown initiated");
    // Worker.close() drains in-progress jobs before closing the Redis connection.
    await Promise.all(workers.map((w) => w.close()));
    await db.$disconnect();
    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    void shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled rejection");
    void shutdown("unhandledRejection");
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Worker startup failed");
  process.exit(1);
});
