// ─── Serialized types (Dates come as strings after JSON serialization) ─────────

export interface SerializedExecution {
  id: string;
  status: string;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  attempt: number;
  jobId: string | null;
}

export interface SerializedRecurrenceRule {
  type: string;
  interval: number;
  daysOfWeek: string[];
  daysOfMonth: number[];
  endsAt: string | null;
  maxOccurrences: number | null;
  occurrenceCount: number;
}

export interface SerializedMessage {
  id: string;
  phoneNumber: string;
  body: string;
  timezone: string;
  scheduledTime: string;
  recurrenceType: string;
  status: string;
  isActive: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  totalExecutions: number;
  createdAt: string;
  recurrenceRule: SerializedRecurrenceRule | null;
  executions: SerializedExecution[];
}

// ─── Schedule description ─────────────────────────────────────────────────────

const SHORT_DAYS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function describeSchedule(msg: SerializedMessage): string {
  const time = formatTime(msg.scheduledTime);
  switch (msg.recurrenceType) {
    case "ONCE":
      return `Once · ${time}`;
    case "DAILY":
      return `Daily · ${time}`;
    case "WEEKDAYS":
      return `Weekdays · ${time}`;
    case "WEEKLY": {
      const days =
        msg.recurrenceRule?.daysOfWeek.map((d) => SHORT_DAYS[d] ?? d).join(", ") ?? "";
      return days ? `${days} · ${time}` : `Weekly · ${time}`;
    }
    case "CUSTOM": {
      const n = msg.recurrenceRule?.interval ?? 1;
      return `Every ${n} day${n !== 1 ? "s" : ""} · ${time}`;
    }
    default:
      return time;
  }
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function formatRelative(isoString: string): string {
  const date = new Date(isoString);
  const now = Date.now();
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  const past = diff < 0;

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < 60_000) return past ? "just now" : "in a moment";
  if (abs < 3_600_000)
    return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000)
    return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 7 * 86_400_000)
    return rtf.format(Math.round(diff / 86_400_000), "day");

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatAbsolute(isoString: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString));
}
