import { Queue } from "bullmq";
import type { SchedulerTickJobData } from "@auto-message/shared";
import { QUEUE_NAMES } from "./names";
import { createRedisConnection } from "../lib/redis";

export const schedulerQueue = new Queue<SchedulerTickJobData>(
  QUEUE_NAMES.SCHEDULER,
  {
    connection: createRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: { count: 1 },
      removeOnFail: { count: 50 },
    },
  },
);
