// Minimal duck-typed interface — avoids taking a @prisma/client dependency in shared.
export interface RecurrenceRuleFields {
  type: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  interval: number;
  daysOfWeek: string[];   // DayOfWeek enum values
  daysOfMonth: number[];
  endsAt: Date | null;
  maxOccurrences: number | null;
  occurrenceCount: number;
}

const DAY_NAMES = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY",
  "THURSDAY", "FRIDAY", "SATURDAY",
] as const;

function getDateInTz(
  utc: Date,
  tz: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(utc);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

function getDayOfWeekInTz(utc: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
  }).formatToParts(utc);
  const name = (
    parts.find((p) => p.type === "weekday")?.value ?? "Sunday"
  ).toUpperCase();
  return DAY_NAMES.indexOf(name as (typeof DAY_NAMES)[number]);
}

function getDayOfMonthInTz(utc: Date, tz: string): number {
  return getDateInTz(utc, tz).day;
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86_400_000);
}

/**
 * Converts a local HH:MM on a calendar date (inferred from `date` in `tz`) to UTC.
 *
 * `date` must fall on the intended calendar date in `tz` — noon UTC is always safe
 * because no timezone is further than ±12 h from UTC.
 *
 * Strategy: treat the desired HH:MM as if it were UTC, observe what that UTC instant
 * looks like in the target timezone, then compensate for the difference.
 * Handles DST correctly for all non-ambiguous times.
 */
export function localToUtc(
  date: Date,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const { year, month, day } = getDateInTz(date, tz);

  // Naïve guess: place HH:MM at UTC
  const guessUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // What does the guess look like in the target timezone?
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(guessUtc);

  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const localH = get("hour") % 24; // some platforms return 24 for midnight
  const localM = get("minute");

  // Shift guess by the observed offset
  const offsetMs =
    (hour - localH) * 3_600_000 + (minute - localM) * 60_000;

  return new Date(guessUtc.getTime() + offsetMs);
}

/**
 * Given the UTC datetime of the most-recently-scheduled occurrence (`fromDate`),
 * returns the UTC datetime of the next occurrence, or null when the series ends.
 */
export function computeNextRunAt(
  msg: { scheduledTime: string; timezone: string },
  rule: RecurrenceRuleFields,
  fromDate: Date,
): Date | null {
  if (rule.type === "ONCE") return null;

  const [hour, minute] = msg.scheduledTime.split(":").map(Number);

  switch (rule.type) {
    case "DAILY":
    case "CUSTOM": {
      const next = addDays(fromDate, rule.interval);
      return localToUtc(next, hour, minute, msg.timezone);
    }

    case "WEEKLY": {
      const targetDows = rule.daysOfWeek.map((d) =>
        DAY_NAMES.indexOf(d as (typeof DAY_NAMES)[number]),
      );
      if (targetDows.length === 0) return null;

      let candidate = addDays(fromDate, 1);
      for (let i = 0; i < 7; i++) {
        if (targetDows.includes(getDayOfWeekInTz(candidate, msg.timezone))) {
          return localToUtc(candidate, hour, minute, msg.timezone);
        }
        candidate = addDays(candidate, 1);
      }
      return null;
    }

    case "MONTHLY": {
      if (rule.daysOfMonth.length === 0) return null;

      let candidate = addDays(fromDate, 1);
      for (let i = 0; i < 32; i++) {
        if (rule.daysOfMonth.includes(getDayOfMonthInTz(candidate, msg.timezone))) {
          return localToUtc(candidate, hour, minute, msg.timezone);
        }
        candidate = addDays(candidate, 1);
      }
      return null;
    }

    default:
      return null;
  }
}

/** False when nextRunAt falls outside the rule's configured time bounds. */
export function isWithinBounds(
  nextRunAt: Date,
  rule: RecurrenceRuleFields,
): boolean {
  if (rule.endsAt && nextRunAt > rule.endsAt) return false;
  if (
    rule.maxOccurrences !== null &&
    rule.occurrenceCount >= rule.maxOccurrences
  )
    return false;
  return true;
}
