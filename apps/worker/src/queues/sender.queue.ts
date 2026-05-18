import { Queue } from "bullmq";
import type { SendMessageJobData } from "@auto-message/shared";
import { QUEUE_NAMES } from "./names";
import { createRedisConnection } from "../lib/redis";

export const senderQueue = new Queue<SendMessageJobData>(QUEUE_NAMES.SENDER, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 }, // 10 s → 20 s → 40 s
    removeOnComplete: { age: 86_400, count: 500 },   // 24 h
    removeOnFail: false,                              // keep in failed set; DLQ handler reads it
  },
});
