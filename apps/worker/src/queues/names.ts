export const QUEUE_NAMES = {
  SCHEDULER: "auto-msg:scheduler",
  SENDER: "auto-msg:sender",
  DLQ: "auto-msg:dlq",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
