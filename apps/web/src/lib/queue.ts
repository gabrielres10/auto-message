import { Queue } from "bullmq";
import { redis } from "./redis";
import type { SendMessageJobData } from "@auto-message/shared";

export const QUEUE_NAMES = {
  SCHEDULER: "auto-msg:scheduler",
  SENDER: "auto-msg:sender",
  DLQ: "auto-msg:dlq",
} as const;

// Web app only needs a reference to the sender queue for job cancellation.
// All enqueuing is handled by the scheduler worker — never add jobs here.
export const senderQueue = new Queue<SendMessageJobData>(QUEUE_NAMES.SENDER, {
  connection: redis,
});
