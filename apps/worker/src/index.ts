import "dotenv/config";
import type { Worker } from "bullmq";
import { logger } from "./lib/logger";
import { db } from "./lib/db";
import { createRedisConnection } from "./lib/redis";
import { connectUser, disconnectUser, destroyAllClients } from "./whatsapp/client";
import { schedulerQueue } from "./queues/scheduler.queue";
import { createSchedulerWorker } from "./workers/scheduler.worker";
import { createSenderWorker } from "./workers/sender.worker";
import { createDLQWorker } from "./workers/dlq.worker";

const CONTROL_CHANNEL = "whatsapp:control";

interface ControlMessage {
  action: "connect" | "disconnect";
  userId: string;
}

async function reconnectActiveSessions(): Promise<void> {
  const activeSessions = await db.whatsAppSession.findMany({
    where: { isConnected: true },
    select: { userId: true },
  });

  if (activeSessions.length === 0) {
    logger.info("No active WhatsApp sessions to restore");
    return;
  }

  logger.info({ count: activeSessions.length }, "Restoring active WhatsApp sessions");

  await Promise.allSettled(
    activeSessions.map(({ userId }) =>
      connectUser(userId).catch((err: unknown) =>
        logger.error({ err, userId }, "Failed to restore session"),
      ),
    ),
  );
}

async function subscribeToControlChannel(): Promise<void> {
  const sub = createRedisConnection();

  sub.on("message", (channel: string, message: string) => {
    if (channel !== CONTROL_CHANNEL) return;

    let cmd: ControlMessage;
    try {
      cmd = JSON.parse(message) as ControlMessage;
    } catch {
      logger.warn({ message }, "Received malformed control message");
      return;
    }

    const { action, userId } = cmd;
    if (!userId || (action !== "connect" && action !== "disconnect")) {
      logger.warn({ cmd }, "Invalid control message");
      return;
    }

    logger.info({ action, userId }, "Received WhatsApp control command");

    if (action === "connect") {
      void connectUser(userId).catch((err: unknown) =>
        logger.error({ err, userId }, "connectUser failed"),
      );
    } else {
      void disconnectUser(userId).catch((err: unknown) =>
        logger.error({ err, userId }, "disconnectUser failed"),
      );
    }
  });

  await sub.subscribe(CONTROL_CHANNEL);
  logger.info({ channel: CONTROL_CHANNEL }, "Subscribed to WhatsApp control channel");
}

async function main() {
  logger.info("Starting auto-message worker");

  // ── Restore previously active sessions ────────────────────────────────────
  await reconnectActiveSessions();

  // ── Subscribe to connect/disconnect commands from the web app ─────────────
  await subscribeToControlChannel();

  // ── BullMQ workers ────────────────────────────────────────────────────────
  const schedulerWorker = createSchedulerWorker();
  const senderWorker = createSenderWorker();
  const dlqWorker = createDLQWorker();

  await schedulerQueue.upsertJobScheduler(
    "scheduler-tick",
    { pattern: "* * * * *" },
    { name: "tick", data: {} },
  );

  logger.info("Workers running — scheduler tick registered (cron: * * * * *)");

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const workers: Worker[] = [schedulerWorker, senderWorker, dlqWorker];

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Graceful shutdown initiated");

    await Promise.all(workers.map((w) => w.close()));
    await destroyAllClients();
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
