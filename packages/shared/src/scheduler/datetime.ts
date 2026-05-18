/**
 * datetime.ts — backward-compatible scheduling helpers.
 *
 * The heavy lifting has moved to recurrence.ts (computeNextRunAt / isWithinBounds)
 * and utils.ts (localTimeToUtc). This file re-exports everything so existing
 * callers keep working without changes.
 */

export type { RecurrenceRuleFields } from "./recurrence";
export {
  computeNextRunAt,
  isWithinBounds,
  generateOccurrences,
} from "./recurrence";

// ─── localToUtc (legacy API) ──────────────────────────────────────────────────

import { localTimeToUtc, getLocalDateStr } from "./utils";

/**
 * @deprecated Use `localTimeToUtc(dateStr, time, tz)` from `./utils` instead.
 *
 * Kept for backward compatibility with the messages API route and any callers
 * that pass a "noon UTC anchor" Date + separate hour/minute.
 *
 * `date` must fall on the intended calendar day in `tz` — noon UTC is always safe
 * because no timezone is further than ±12 h from UTC.
 */
export function localToUtc(
  date: Date,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const dateStr = getLocalDateStr(date, tz);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return localTimeToUtc(dateStr, `${hh}:${mm}`, tz);
}
