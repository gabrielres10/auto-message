export type { SendMessageJobData, DLQJobData, SchedulerTickJobData } from "./jobs";

// Enum mirror types — use Prisma-generated enums in app code; these are for
// packages that cannot import @prisma/client.
export type MessageStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type ExecutionStatus =
  | "PENDING"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "CANCELLED"
  | "RETRYING";
export type RecurrenceType =
  | "ONCE"
  | "DAILY"
  | "WEEKDAYS"
  | "WEEKLY"
  | "MONTHLY"
  | "CUSTOM";
export type DayOfWeek =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";
