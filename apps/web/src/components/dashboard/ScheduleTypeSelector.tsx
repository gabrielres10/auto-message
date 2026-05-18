"use client";

import { cn } from "@/lib/utils";

export type ScheduleMode = "ONCE" | "DAILY" | "WEEKDAYS" | "WEEKLY" | "CUSTOM";

interface ModeOption {
  value: ScheduleMode;
  emoji: string;
  label: string;
  description: string;
}

const OPTIONS: ModeOption[] = [
  {
    value: "ONCE",
    emoji: "🔔",
    label: "Once",
    description: "Send at a specific date and time",
  },
  {
    value: "DAILY",
    emoji: "☀️",
    label: "Every day",
    description: "Same time each day",
  },
  {
    value: "WEEKDAYS",
    emoji: "💼",
    label: "Weekdays",
    description: "Monday through Friday",
  },
  {
    value: "WEEKLY",
    emoji: "📅",
    label: "Custom days",
    description: "Pick specific days of the week",
  },
  {
    value: "CUSTOM",
    emoji: "🔄",
    label: "Interval",
    description: "Every N days",
  },
];

interface ScheduleTypeSelectorProps {
  value: ScheduleMode;
  onChange: (mode: ScheduleMode) => void;
}

export default function ScheduleTypeSelector({
  value,
  onChange,
}: ScheduleTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
            "hover:border-harmony-cta/60 hover:bg-harmony-cta/5",
            value === opt.value
              ? "border-harmony-cta bg-harmony-cta/8 ring-1 ring-harmony-cta/30"
              : "border-harmony-border-subtle bg-harmony-surface-1",
          )}
        >
          <span className="text-xl leading-none">{opt.emoji}</span>
          <span
            className={cn(
              "text-xs font-semibold",
              value === opt.value
                ? "text-harmony-cta"
                : "text-harmony-fg",
            )}
          >
            {opt.label}
          </span>
          <span className="hidden text-[10px] leading-tight text-harmony-fg-secondary sm:block">
            {opt.description}
          </span>
        </button>
      ))}
    </div>
  );
}
