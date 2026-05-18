import { Queue } from "bullmq";
import type { DLQJobData } from "@auto-message/shared";
import { QUEUE_NAMES } from "./names";
import { createRedisConnection } from "../lib/redis";

export const dlqQueue = new Queue<DLQJobData>(QUEUE_NAMES.DLQ, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 1,        // DLQ jobs never auto-retry
    removeOnComplete: false, // keep indefinitely for manual inspection / requeue
    removeOnFail: false,
  },
});
