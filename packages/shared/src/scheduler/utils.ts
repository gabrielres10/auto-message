import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { addDays, format } from "date-fns";

/**
 * DST-safe conversion of a local calendar date + HH:MM time to UTC.
 *
 * Uses date-fns-tz `fromZonedTime` which correctly handles:
 * - Spring forward: times in the skipped hour are advanced to the next valid moment
 * - Fall back: ambiguous times resolve to the first occurrence (standard time)
 *
 * @param dateStr  "YYYY-MM-DD" calendar date in the local timezone
 * @param time     "HH:MM" 24-hour time in the local timezone
 * @param tz       IANA timezone, e.g. "America/New_York"
 */
export function localTimeToUtc(dateStr: string, time: string, tz: string): Date {
  return fromZonedTime(`${dateStr}T${time}:00`, tz);
}

/**
 * Returns the calendar date string ("YYYY-MM-DD") for a UTC instant
 * as it appears in the given timezone.
 */
export function getLocalDateStr(utcDate: Date, tz: string): string {
  return formatInTimeZone(utcDate, tz, "yyyy-MM-dd");
}

/**
 * Advances a local calendar date by N days.
 * Uses noon UTC as the anchor to avoid DST day-boundary issues.
 */
export function addLocalDays(localDateStr: string, days: number): string {
  const anchor = new Date(`${localDateStr}T12:00:00Z`);
  return format(addDays(anchor, days), "yyyy-MM-dd");
}

/**
 * Returns the day-of-week name ("MONDAY" etc.) for a calendar date in a timezone.
 * Uses noon UTC anchor so the local calendar day is stable across all offsets.
 */
export function getLocalDayOfWeek(dateStr: string, tz: string): string {
  const anchor = new Date(`${dateStr}T12:00:00Z`);
  const local = toZonedTime(anchor, tz);
  return DAY_NAMES[local.getDay()];
}

/**
 * Returns the day-of-month (1–31) for a UTC instant in the given timezone.
 */
export function getLocalDayOfMonth(utcDate: Date, tz: string): number {
  return toZonedTime(utcDate, tz).getDate();
}

/** Validates an IANA timezone string. */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Validates HH:MM 24-hour format. */
export function isValidTimeString(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [h, m] = time.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Validates YYYY-MM-DD format and real calendar date. */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  return !isNaN(d.getTime());
}

// ─── Internal ─────────────────────────────────────────────────────────────────

export const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;
