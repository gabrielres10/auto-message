import { Worker, type Job } from "bullmq";
import type { SendMessageJobData } from "@auto-message/shared";
import { redis } from "../lib/redis";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { getWhatsAppClient } from "../whatsapp/client";
import { QUEUE_NAMES } from "../queues/message.queue";

export function createMessageWorker() {
  const worker = new Worker<SendMessageJobData>(
    QUEUE_NAMES.MESSAGES,
    async (job: Job<SendMessageJobData>) => {
      const { messageId, recipient, content } = job.data;
      logger.info({ jobId: job.id, messageId }, "Processing scheduled message");

      await db.scheduledMessage.update({
        where: { id: messageId },
        data: { status: "PROCESSING" },
      });

      const client = getWhatsAppClient();
      await client.sendMessage(recipient, content);

      await db.scheduledMessage.update({
        where: { id: messageId },
        data: { status: "SENT" },
      });

      logger.info({ jobId: job.id, messageId }, "Message sent successfully");
    },
    {
      connection: redis,
      // Keep concurrency at 1 to respect WhatsApp rate limits
      concurrency: 1,
    }
  );

  worker.on("failed", async (job, err) => {
    logger.error({ jobId: job?.id, err }, "Message job failed");

    if (job?.data.messageId) {
      await db.scheduledMessage
        .update({
          where: { id: job.data.messageId },
          data: { status: "FAILED", error: err.message },
        })
        .catch((dbErr) =>
          logger.error({ dbErr }, "Failed to persist error status")
        );
    }
  });

  return worker;
}
