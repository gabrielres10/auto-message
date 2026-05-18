import { Queue } from "bullmq";
import { redis } from "./redis";
import type { SendMessageJobData } from "@auto-message/shared";

export const QUEUE_NAMES = {
  MESSAGES: "whatsapp-messages",
} as const;

export const messageQueue = new Queue<SendMessageJobData>(
  QUEUE_NAMES.MESSAGES,
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 60 * 60 * 24 },     // 24 h
      removeOnFail: { age: 60 * 60 * 24 * 7 },     // 7 d
    },
  }
);
