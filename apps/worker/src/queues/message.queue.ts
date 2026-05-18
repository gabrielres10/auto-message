import { Queue } from "bullmq";
import { redis } from "../lib/redis";
import type { SendMessageJobData } from "@auto-message/shared";

export const QUEUE_NAMES = {
  MESSAGES: "whatsapp-messages",
} as const;

export const messageQueue = new Queue<SendMessageJobData>(
  QUEUE_NAMES.MESSAGES,
  { connection: redis }
);
