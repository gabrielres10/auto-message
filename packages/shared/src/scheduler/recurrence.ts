import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  localTimeToUtc,
  getLocalDateStr,
  addLocalDays,
  getLocalDayOfWeek,
} from "./utils";
import { WEEKDAY_DAYS } from "../types/scheduling";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Duck-typed interface for recurrence rule data. Avoids a hard @prisma/client
 * dependency in the shared package while remaining compatible with the Prisma
 * RecurrenceRule model.
 */
export interface RecurrenceRuleFields {
  type: "ONCE" | "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  interval: number;        // every N days (DAILY/CUSTOM) or weeks (WEEKLY)
  daysOfWeek: string[];    // DayOfWeek enum values
  daysOfMonth: number[];   // 1–31 (MONTHLY)
  endsAt: Date | null;
  maxOccurrences: number | null;
  occurrenceCount: number; // how many times it has already fired
}

// ─── Core calculator ──────────────────────────────────────────────────────────

/**
 * Given the UTC datetime of the most-recently-scheduled occurrence (`fromDate`),
 * returns the UTC datetime of the next occurrence, or null when the series ends.
 *
 * DST-safe: all date arithmetic stays in the user's local calendar day via
 * date-fns-tz, so clocks springing/falling never shift the fire time.
 */
export function computeNextRunAt(
  msg: { scheduledTime: string; timezone: string },
  rule: RecurrenceRuleFields,
  fromDate: Date,
): Date | null {
  const { scheduledTime, timezone } = msg;

  if (rule.type === "ONCE") return null;

  const fromLocalDateStr = getLocalDateStr(fromDate, timezone);

  switch (rule.type) {
    case "DAILY": {
      const nextDateStr = addLocalDays(fromLocalDateStr, rule.interval);
      return localTimeToUtc(nextDateStr, scheduledTime, timezone);
    }

    case "WEEKDAYS": {
      // Mon–Fri, advance day by day (never more than 3 days for Fri→Mon)
      return findNextDayMatch(
        fromLocalDateStr,
        scheduledTime,
        timezone,
        WEEKDAY_DAYS as unknown as string[],
      );
    }

    case "WEEKLY": {
      if (rule.daysOfWeek.length === 0) return null;
      return findNextDayMatch(
        fromLocalDateStr,
        scheduledTime,
        timezone,
        rule.daysOfWeek,
      );
    }

    case "MONTHLY": {
      if (rule.daysOfMonth.length === 0) return null;
      return findNextMonthDayMatch(
        fromLocalDateStr,
        scheduledTime,
        timezone,
        rule.daysOfMonth,
      );
    }

    case "CUSTOM": {
      const nextDateStr = addLocalDays(fromLocalDateStr, rule.interval);
      return localTimeToUtc(nextDateStr, scheduledTime, timezone);
    }

    default:
      return null;
  }
}

// ─── Bounds check ─────────────────────────────────────────────────────────────

/** Returns false when nextRunAt falls outside the rule's configured bounds. */
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

// ─── Preview generator ────────────────────────────────────────────────────────

/**
 * Generates the next `count` UTC fire times for a recurring rule.
 * Useful for schedule preview in the UI.
 *
 * @param msg   Scheduled message with scheduledTime and timezone
 * @param rule  Recurrence rule (occurrenceCount is treated as the current count)
 * @param fromDate  The UTC time to start generating from (typically nextRunAt)
 * @param count  How many upcoming occurrences to return (max 50)
 */
export function generateOccurrences(
  msg: { scheduledTime: string; timezone: string },
  rule: RecurrenceRuleFields,
  fromDate: Date,
  count: number,
): Date[] {
  const safeCount = Math.min(count, 50);
  const occurrences: Date[] = [];
  let cursor = fromDate;
  let currentOccurrenceCount = rule.occurrenceCount;

  // Include fromDate itself if it's a valid first occurrence
  if (isWithinBounds(fromDate, rule)) {
    occurrences.push(fromDate);
    currentOccurrenceCount++;
  }

  while (occurrences.length < safeCount) {
    const next = computeNextRunAt(msg, rule, cursor);
    if (!next) break;

    const checkRule: RecurrenceRuleFields = {
      ...rule,
      occurrenceCount: currentOccurrenceCount,
    };
    if (!isWithinBounds(next, checkRule)) break;

    occurrences.push(next);
    cursor = next;
    currentOccurrenceCount++;
  }

  return occurrences;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Scans forward (up to 7 days) to find the next calendar day in `targetDays`.
 */
function findNextDayMatch(
  fromLocalDateStr: string,
  scheduledTime: string,
  tz: string,
  targetDays: string[],
): Date | null {
  const anchor = new Date(`${fromLocalDateStr}T12:00:00Z`);

  for (let i = 1; i <= 7; i++) {
    const candidate = addDays(anchor, i);
    const candidateDateStr = format(candidate, "yyyy-MM-dd");
    const dayName = getLocalDayOfWeek(candidateDateStr, tz);

    if (targetDays.includes(dayName)) {
      return localTimeToUtc(candidateDateStr, scheduledTime, tz);
    }
  }

  return null;
}

/**
 * Scans forward (up to 32 days) to find the next calendar day whose
 * day-of-month is in `daysOfMonth`.
 */
function findNextMonthDayMatch(
  fromLocalDateStr: string,
  scheduledTime: string,
  tz: string,
  daysOfMonth: number[],
): Date | null {
  const anchor = new Date(`${fromLocalDateStr}T12:00:00Z`);

  for (let i = 1; i <= 32; i++) {
    const candidate = addDays(anchor, i);
    const candidateDateStr = format(candidate, "yyyy-MM-dd");
    // Use toZonedTime to get the local day-of-month in the target tz
    const local = toZonedTime(candidate, tz);

    if (daysOfMonth.includes(local.getDate())) {
      return localTimeToUtc(candidateDateStr, scheduledTime, tz);
    }
  }

  return null;
}
