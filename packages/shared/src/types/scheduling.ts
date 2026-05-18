// ─── Scheduling Mode ─────────────────────────────────────────────────────────

/**
 * User-facing scheduling mode. Maps to a RecurrenceType + optional daysOfWeek
 * before being persisted.
 *
 * ONCE     → fire exactly once at the given date/time
 * DAILY    → every day at the scheduled time
 * WEEKDAYS → Monday–Friday at the scheduled time (convenience alias)
 * WEEKLY   → user-selected days of the week
 * CUSTOM   → every N days (intervalDays required)
 */
export const SchedulingMode = {
  ONCE: "ONCE",
  DAILY: "DAILY",
  WEEKDAYS: "WEEKDAYS",
  WEEKLY: "WEEKLY",
  CUSTOM: "CUSTOM",
} as const;

export type SchedulingMode = (typeof SchedulingMode)[keyof typeof SchedulingMode];

// ─── Day of Week ──────────────────────────────────────────────────────────────

export const DayOfWeekEnum = {
  SUNDAY: "SUNDAY",
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
} as const;

export type DayOfWeekEnum = (typeof DayOfWeekEnum)[keyof typeof DayOfWeekEnum];

/** Mon–Fri used by the WEEKDAYS scheduling mode. */
export const WEEKDAY_DAYS: DayOfWeekEnum[] = [
  DayOfWeekEnum.MONDAY,
  DayOfWeekEnum.TUESDAY,
  DayOfWeekEnum.WEDNESDAY,
  DayOfWeekEnum.THURSDAY,
  DayOfWeekEnum.FRIDAY,
];

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface ScheduleInput {
  phoneNumber: string;     // E.164, e.g. "+573001234567"
  body: string;
  timezone: string;        // IANA, e.g. "America/New_York"
  scheduledTime: string;   // "HH:MM" 24-hour
  scheduledDate: string;   // "YYYY-MM-DD" — start date / first occurrence
  mode: SchedulingMode;

  // WEEKLY mode — at least one day required
  daysOfWeek?: DayOfWeekEnum[];

  // CUSTOM mode — required, 1–365
  intervalDays?: number;

  // Optional recurrence bounds (applies to all recurring modes)
  endsAt?: string;          // "YYYY-MM-DD"
  maxOccurrences?: number;  // positive integer
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
