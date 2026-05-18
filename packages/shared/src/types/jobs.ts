export interface SendMessageJobData {
  executionId: string;
  scheduledMessageId: string;
  userId: string;
  phoneNumber: string;    // E.164
  body: string;
  scheduledFor: string;   // ISO 8601 UTC
  timezone: string;       // IANA — for logging
}

export interface DLQJobData {
  originalJobId: string | undefined;
  executionId: string;
  scheduledMessageId: string;
  failedAt: string;       // ISO 8601
  finalError: string;
  attemptsMade: number;
}

export type SchedulerTickJobData = Record<string, never>;
