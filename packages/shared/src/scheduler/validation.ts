import {
  isValidTimezone,
  isValidTimeString,
  isValidDateString,
  localTimeToUtc,
} from "./utils";
import {
  SchedulingMode,
  DayOfWeekEnum,
  WEEKDAY_DAYS,
  type ScheduleInput,
  type ValidationError,
  type ValidationResult,
} from "../types/scheduling";

const E164_RE = /^\+[1-9]\d{6,14}$/;
const VALID_DAYS = new Set<string>(Object.values(DayOfWeekEnum));

// ─── Primary validator ────────────────────────────────────────────────────────

/**
 * Validates a schedule creation input end-to-end.
 *
 * Returns a `ValidationResult` with every error found so callers can surface
 * them all at once rather than one field at a time.
 */
export function validateScheduleInput(input: ScheduleInput): ValidationResult {
  const errors: ValidationError[] = [];

  // ── Phone number ────────────────────────────────────────────────────────────
  if (!input.phoneNumber) {
    errors.push({ field: "phoneNumber", message: "Phone number is required" });
  } else if (!E164_RE.test(input.phoneNumber)) {
    errors.push({
      field: "phoneNumber",
      message:
        'Phone number must be in E.164 format (e.g. "+573001234567")',
    });
  }

  // ── Message body ────────────────────────────────────────────────────────────
  if (!input.body || !input.body.trim()) {
    errors.push({ field: "body", message: "Message body is required" });
  } else if (input.body.length > 4096) {
    errors.push({
      field: "body",
      message: "Message body must not exceed 4096 characters",
    });
  }

  // ── Timezone ────────────────────────────────────────────────────────────────
  if (!input.timezone) {
    errors.push({ field: "timezone", message: "Timezone is required" });
  } else if (!isValidTimezone(input.timezone)) {
    errors.push({
      field: "timezone",
      message: `"${input.timezone}" is not a valid IANA timezone`,
    });
  }

  // ── Scheduled time ──────────────────────────────────────────────────────────
  if (!input.scheduledTime) {
    errors.push({
      field: "scheduledTime",
      message: "Scheduled time is required (HH:MM)",
    });
  } else if (!isValidTimeString(input.scheduledTime)) {
    errors.push({
      field: "scheduledTime",
      message: "Scheduled time must be in HH:MM 24-hour format",
    });
  }

  // ── Scheduled date ──────────────────────────────────────────────────────────
  if (!input.scheduledDate) {
    errors.push({
      field: "scheduledDate",
      message: "Scheduled date is required (YYYY-MM-DD)",
    });
  } else if (!isValidDateString(input.scheduledDate)) {
    errors.push({
      field: "scheduledDate",
      message: "Scheduled date must be a valid YYYY-MM-DD date",
    });
  }

  // ── Scheduling mode ─────────────────────────────────────────────────────────
  const validModes = Object.values(SchedulingMode) as string[];
  if (!input.mode || !validModes.includes(input.mode)) {
    errors.push({
      field: "mode",
      message: `Mode must be one of: ${validModes.join(", ")}`,
    });
  }

  // ── Mode-specific rules (only when the base fields are valid) ───────────────
  const baseFieldsOk =
    errors.length === 0 ||
    errors.every(
      (e) =>
        e.field !== "timezone" &&
        e.field !== "scheduledTime" &&
        e.field !== "scheduledDate" &&
        e.field !== "mode",
    );

  if (baseFieldsOk) {
    // ONCE — must be a future datetime
    if (input.mode === SchedulingMode.ONCE) {
      try {
        const fireTime = localTimeToUtc(
          input.scheduledDate,
          input.scheduledTime,
          input.timezone,
        );
        if (fireTime <= new Date()) {
          errors.push({
            field: "scheduledDate",
            message: "Scheduled time must be in the future",
          });
        }
      } catch {
        // localTimeToUtc will throw only if timezone is invalid — already caught
      }
    }

    // WEEKLY — requires at least one explicit day
    if (input.mode === SchedulingMode.WEEKLY) {
      if (!input.daysOfWeek || input.daysOfWeek.length === 0) {
        errors.push({
          field: "daysOfWeek",
          message:
            "At least one day of the week must be selected for weekly recurrence",
        });
      } else {
        const invalid = input.daysOfWeek.filter((d) => !VALID_DAYS.has(d));
        if (invalid.length > 0) {
          errors.push({
            field: "daysOfWeek",
            message: `Invalid day value(s): ${invalid.join(", ")}`,
          });
        }
      }
    }

    // CUSTOM — requires a positive interval (1–365 days)
    if (input.mode === SchedulingMode.CUSTOM) {
      if (input.intervalDays === undefined || input.intervalDays === null) {
        errors.push({
          field: "intervalDays",
          message: "intervalDays is required for custom recurrence",
        });
      } else if (
        !Number.isInteger(input.intervalDays) ||
        input.intervalDays < 1
      ) {
        errors.push({
          field: "intervalDays",
          message: "intervalDays must be a positive integer",
        });
      } else if (input.intervalDays > 365) {
        errors.push({
          field: "intervalDays",
          message: "intervalDays must not exceed 365",
        });
      }
    }

    // Bounds — optional on all recurring modes
    if (input.mode !== SchedulingMode.ONCE) {
      if (input.endsAt !== undefined) {
        if (!isValidDateString(input.endsAt)) {
          errors.push({
            field: "endsAt",
            message: "endsAt must be a valid YYYY-MM-DD date",
          });
        } else if (input.endsAt < input.scheduledDate) {
          errors.push({
            field: "endsAt",
            message: "endsAt must be on or after scheduledDate",
          });
        }
      }

      if (input.maxOccurrences !== undefined) {
        if (
          !Number.isInteger(input.maxOccurrences) ||
          input.maxOccurrences < 1
        ) {
          errors.push({
            field: "maxOccurrences",
            message: "maxOccurrences must be a positive integer",
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Granular validators ──────────────────────────────────────────────────────

/** Validates an IANA timezone string. */
export function validateTimezone(tz: string): ValidationResult {
  if (!tz)
    return {
      valid: false,
      errors: [{ field: "timezone", message: "Timezone is required" }],
    };
  if (!isValidTimezone(tz))
    return {
      valid: false,
      errors: [
        {
          field: "timezone",
          message: `"${tz}" is not a valid IANA timezone`,
        },
      ],
    };
  return { valid: true, errors: [] };
}

/** Validates an HH:MM time string. */
export function validateTimeString(time: string): ValidationResult {
  if (!time)
    return {
      valid: false,
      errors: [{ field: "scheduledTime", message: "Time is required" }],
    };
  if (!isValidTimeString(time))
    return {
      valid: false,
      errors: [
        {
          field: "scheduledTime",
          message: "Time must be in HH:MM 24-hour format",
        },
      ],
    };
  return { valid: true, errors: [] };
}

/** Validates a YYYY-MM-DD date string. */
export function validateDateString(date: string): ValidationResult {
  if (!date)
    return {
      valid: false,
      errors: [{ field: "scheduledDate", message: "Date is required" }],
    };
  if (!isValidDateString(date))
    return {
      valid: false,
      errors: [
        {
          field: "scheduledDate",
          message: "Date must be in YYYY-MM-DD format",
        },
      ],
    };
  return { valid: true, errors: [] };
}
