import "dotenv/config";
import type { Worker } from "bullmq";
import { logger } from "./lib/logger";
import { db } from "./lib/db";
import { initWhatsAppClient, destroyWhatsAppClient } from "./whatsapp/client";
import { schedulerQueue } from "./queues/scheduler.queue";
import { createSchedulerWorker } from "./workers/scheduler.worker";
import { createSenderWorker } from "./workers/sender.worker";
import { createDLQWorker } from "./workers/dlq.worker";

async function main() {
  // ── Validate required env vars before anything else ─────────────────────────
  const WORKER_USER_ID = process.env.WORKER_USER_ID;
  if (!WORKER_USER_ID) {
    logger.fatal(
      "WORKER_USER_ID env var is required. " +
        "Set it to the DB user ID of the account that owns the WhatsApp session.",
    );
    process.exit(1);
  }

  logger.info("Starting auto-message worker");

  // ── WhatsApp client ─────────────────────────────────────────────────────────
  // initialize() boots Puppeteer and begins the auth flow (LocalAuth or QR scan).
  // Workers start immediately and will retry jobs until the client becomes READY.
  await initWhatsAppClient(WORKER_USER_ID);

  // ── BullMQ workers ──────────────────────────────────────────────────────────
  const schedulerWorker = createSchedulerWorker();
  const senderWorker = createSenderWorker();
  const dlqWorker = createDLQWorker();

  // Register the repeatable scheduler tick — idempotent, safe on every startup.
  await schedulerQueue.upsertJobScheduler(
    "scheduler-tick",
    { pattern: "* * * * *" }, // every minute
    { name: "tick", data: {} },
  );

  logger.info("Workers running — scheduler tick registered (cron: * * * * *)");

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const workers: Worker[] = [schedulerWorker, senderWorker, dlqWorker];

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Graceful shutdown initiated");

    // Worker.close() waits for in-flight jobs to complete before closing Redis.
    await Promise.all(workers.map((w) => w.close()));

    // Persist disconnect state and destroy Puppeteer.
    await destroyWhatsAppClient();

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

main().catch((err: unknown) => {
  logger.fatal({ err }, "Worker startup failed");
  process.exit(1);
});
