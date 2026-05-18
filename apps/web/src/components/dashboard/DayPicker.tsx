"use client";

import { cn } from "@/lib/utils";

export type DayValue =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

const DAYS: { value: DayValue; short: string }[] = [
  { value: "MONDAY", short: "M" },
  { value: "TUESDAY", short: "T" },
  { value: "WEDNESDAY", short: "W" },
  { value: "THURSDAY", short: "T" },
  { value: "FRIDAY", short: "F" },
  { value: "SATURDAY", short: "S" },
  { value: "SUNDAY", short: "S" },
];

interface DayPickerProps {
  value: DayValue[];
  onChange: (days: DayValue[]) => void;
}

export default function DayPicker({ value, onChange }: DayPickerProps) {
  const toggle = (day: DayValue) => {
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day],
    );
  };

  return (
    <div className="flex gap-1.5">
      {DAYS.map((d, i) => (
        <button
          key={`${d.value}-${i}`}
          type="button"
          onClick={() => toggle(d.value)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all",
            "border",
            value.includes(d.value)
              ? "border-harmony-cta bg-harmony-cta text-white"
              : "border-harmony-border-subtle bg-harmony-surface-1 text-harmony-fg hover:border-harmony-cta/50 hover:bg-harmony-cta/5",
          )}
          title={d.value.charAt(0) + d.value.slice(1).toLowerCase()}
        >
          {d.short}
        </button>
      ))}
    </div>
  );
}
