import "dotenv/config";
import { initWhatsAppClient } from "./whatsapp/client";
import { createMessageWorker } from "./workers/message.worker";
import { logger } from "./lib/logger";
import { db } from "./lib/db";

async function main() {
  logger.info("Starting auto-message worker...");

  await initWhatsAppClient();

  const worker = createMessageWorker();
  logger.info("Worker started — listening for jobs");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully...");
    await worker.close();
    await db.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error(err, "Fatal error — worker exiting");
  process.exit(1);
});
