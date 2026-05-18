"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import ScheduleTypeSelector, {
  type ScheduleMode,
} from "./ScheduleTypeSelector";
import TimezoneSelector from "./TimezoneSelector";
import DayPicker, { type DayValue } from "./DayPicker";

interface FormErrors {
  phoneNumber?: string;
  body?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  timezone?: string;
  daysOfWeek?: string;
  intervalDays?: string;
  general?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function CreateMessageForm() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<ScheduleMode>("ONCE");
  const [scheduledDate, setScheduledDate] = useState(todayStr());
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [timezone, setTimezone] = useState(localTimezone);
  const [daysOfWeek, setDaysOfWeek] = useState<DayValue[]>([]);
  const [intervalDays, setIntervalDays] = useState(1);
  const [endType, setEndType] = useState<"never" | "after" | "on">("never");
  const [maxOccurrences, setMaxOccurrences] = useState(10);
  const [endsAt, setEndsAt] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const isRecurring = mode !== "ONCE";

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!phoneNumber.trim()) {
      e.phoneNumber = "Phone number is required";
    } else if (!/^\+[1-9]\d{6,14}$/.test(phoneNumber.trim())) {
      e.phoneNumber = 'Must be E.164 format, e.g. "+12125551234"';
    }
    if (!body.trim()) {
      e.body = "Message body is required";
    } else if (body.length > 4096) {
      e.body = "Must not exceed 4096 characters";
    }
    if (!scheduledDate) e.scheduledDate = "Date is required";
    if (!scheduledTime) e.scheduledTime = "Time is required";
    if (!timezone) e.timezone = "Timezone is required";
    if (mode === "WEEKLY" && daysOfWeek.length === 0) {
      e.daysOfWeek = "Select at least one day";
    }
    if (mode === "CUSTOM" && (intervalDays < 1 || intervalDays > 365)) {
      e.intervalDays = "Interval must be between 1 and 365 days";
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      phoneNumber: phoneNumber.trim(),
      body: body.trim(),
      mode,
      scheduledDate,
      scheduledTime,
      timezone,
    };

    if (mode === "WEEKLY") payload.daysOfWeek = daysOfWeek;
    if (mode === "CUSTOM") payload.intervalDays = intervalDays;

    if (isRecurring && endType === "after") {
      payload.maxOccurrences = maxOccurrences;
    }
    if (isRecurring && endType === "on" && endsAt) {
      payload.endsAt = endsAt;
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          const fieldErrors: FormErrors = {};
          for (const err of data.details as { field: string; message: string }[]) {
            (fieldErrors as Record<string, string>)[err.field] = err.message;
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error ?? "Failed to create schedule" });
        }
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({ general: "Network error — please try again" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <AlertCircle size={15} strokeWidth={1.5} />
          {errors.general}
        </div>
      )}

      {/* ── Recipient ─────────────────────────────────────── */}
      <Panel padding="md" className="space-y-4">
        <h2 className="text-sm font-semibold text-harmony-fg">Recipient</h2>
        <Field label="Phone number" error={errors.phoneNumber}>
          <Input
            type="tel"
            placeholder="+12125551234"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className={errors.phoneNumber ? "border-red-400" : ""}
          />
          <p className="mt-1 text-xs text-harmony-fg-secondary">
            International format with country code
          </p>
        </Field>
      </Panel>

      {/* ── Message ───────────────────────────────────────── */}
      <Panel padding="md" className="space-y-4">
        <h2 className="text-sm font-semibold text-harmony-fg">Message</h2>
        <Field label="Body" error={errors.body}>
          <Textarea
            placeholder="Type your message…"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={errors.body ? "border-red-400" : ""}
          />
          <p className="mt-1 text-right text-xs text-harmony-fg-secondary">
            {body.length}/4096
          </p>
        </Field>
      </Panel>

      {/* ── Schedule type ──────────────────────────────────── */}
      <Panel padding="md" className="space-y-4">
        <h2 className="text-sm font-semibold text-harmony-fg">Repeat</h2>
        <ScheduleTypeSelector value={mode} onChange={setMode} />

        {/* Custom days picker */}
        {mode === "WEEKLY" && (
          <div className="space-y-1.5">
            <Label>Days of the week</Label>
            <DayPicker value={daysOfWeek} onChange={setDaysOfWeek} />
            {errors.daysOfWeek && (
              <p className="text-xs text-red-500">{errors.daysOfWeek}</p>
            )}
          </div>
        )}

        {/* Custom interval */}
        {mode === "CUSTOM" && (
          <Field label="Every N days" error={errors.intervalDays}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={intervalDays}
                onChange={(e) =>
                  setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-24"
              />
              <span className="text-sm text-harmony-fg-secondary">
                day{intervalDays !== 1 ? "s" : ""}
              </span>
            </div>
          </Field>
        )}
      </Panel>

      {/* ── Date & Time ───────────────────────────────────── */}
      <Panel padding="md" className="space-y-4">
        <h2 className="text-sm font-semibold text-harmony-fg">
          {isRecurring ? "Starts" : "When"}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={isRecurring ? "Start date" : "Date"} error={errors.scheduledDate}>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className={cn(
                "block",
                errors.scheduledDate ? "border-red-400" : "",
              )}
            />
          </Field>
          <Field label="Time" error={errors.scheduledTime}>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className={errors.scheduledTime ? "border-red-400" : ""}
            />
          </Field>
        </div>

        <Field label="Timezone" error={errors.timezone}>
          <TimezoneSelector value={timezone} onChange={setTimezone} />
        </Field>
      </Panel>

      {/* ── End conditions (recurring only) ───────────────── */}
      {isRecurring && (
        <Panel padding="md" className="space-y-4">
          <h2 className="text-sm font-semibold text-harmony-fg">Ends</h2>
          <div className="space-y-2">
            {(
              [
                ["never", "Never", null],
                ["after", "After", null],
                ["on", "On date", null],
              ] as [typeof endType, string, null][]
            ).map(([val, lbl]) => (
              <label
                key={val}
                className="flex cursor-pointer items-center gap-3"
              >
                <input
                  type="radio"
                  name="endType"
                  value={val}
                  checked={endType === val}
                  onChange={() => setEndType(val)}
                  className="accent-harmony-cta"
                />
                <span className="text-sm text-harmony-fg">{lbl}</span>

                {val === "after" && endType === "after" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={maxOccurrences}
                      onChange={(e) =>
                        setMaxOccurrences(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-20 h-7 text-xs"
                    />
                    <span className="text-sm text-harmony-fg-secondary">
                      occurrence{maxOccurrences !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {val === "on" && endType === "on" && (
                  <Input
                    type="date"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="h-7 w-40 text-xs"
                  />
                )}
              </label>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Submit ────────────────────────────────────────── */}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Send size={15} strokeWidth={1.5} />
        )}
        {submitting ? "Scheduling…" : "Schedule Message"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
