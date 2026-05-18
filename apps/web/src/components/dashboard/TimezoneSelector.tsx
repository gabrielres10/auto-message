"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TZ {
  value: string;
  label: string;
  region: string;
  offset: string;
}

const TIMEZONE_LIST: Omit<TZ, "offset">[] = [
  // Americas
  { value: "Pacific/Honolulu", label: "Honolulu", region: "Americas" },
  { value: "America/Anchorage", label: "Anchorage", region: "Americas" },
  { value: "America/Los_Angeles", label: "Los Angeles", region: "Americas" },
  { value: "America/Denver", label: "Denver", region: "Americas" },
  { value: "America/Chicago", label: "Chicago", region: "Americas" },
  { value: "America/New_York", label: "New York", region: "Americas" },
  { value: "America/Toronto", label: "Toronto", region: "Americas" },
  { value: "America/Vancouver", label: "Vancouver", region: "Americas" },
  { value: "America/Mexico_City", label: "Mexico City", region: "Americas" },
  { value: "America/Bogota", label: "Bogotá", region: "Americas" },
  { value: "America/Lima", label: "Lima", region: "Americas" },
  { value: "America/Santiago", label: "Santiago", region: "Americas" },
  { value: "America/Sao_Paulo", label: "São Paulo", region: "Americas" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires", region: "Americas" },
  // Europe
  { value: "Europe/London", label: "London", region: "Europe" },
  { value: "Europe/Lisbon", label: "Lisbon", region: "Europe" },
  { value: "Europe/Paris", label: "Paris", region: "Europe" },
  { value: "Europe/Berlin", label: "Berlin", region: "Europe" },
  { value: "Europe/Madrid", label: "Madrid", region: "Europe" },
  { value: "Europe/Amsterdam", label: "Amsterdam", region: "Europe" },
  { value: "Europe/Rome", label: "Rome", region: "Europe" },
  { value: "Europe/Warsaw", label: "Warsaw", region: "Europe" },
  { value: "Europe/Stockholm", label: "Stockholm", region: "Europe" },
  { value: "Europe/Helsinki", label: "Helsinki", region: "Europe" },
  { value: "Europe/Athens", label: "Athens", region: "Europe" },
  { value: "Europe/Istanbul", label: "Istanbul", region: "Europe" },
  { value: "Europe/Moscow", label: "Moscow", region: "Europe" },
  // Africa
  { value: "Africa/Cairo", label: "Cairo", region: "Africa" },
  { value: "Africa/Lagos", label: "Lagos", region: "Africa" },
  { value: "Africa/Nairobi", label: "Nairobi", region: "Africa" },
  { value: "Africa/Johannesburg", label: "Johannesburg", region: "Africa" },
  // Asia
  { value: "Asia/Dubai", label: "Dubai", region: "Asia" },
  { value: "Asia/Karachi", label: "Karachi", region: "Asia" },
  { value: "Asia/Kolkata", label: "Mumbai / Delhi", region: "Asia" },
  { value: "Asia/Dhaka", label: "Dhaka", region: "Asia" },
  { value: "Asia/Bangkok", label: "Bangkok", region: "Asia" },
  { value: "Asia/Singapore", label: "Singapore", region: "Asia" },
  { value: "Asia/Hong_Kong", label: "Hong Kong", region: "Asia" },
  { value: "Asia/Shanghai", label: "Shanghai / Beijing", region: "Asia" },
  { value: "Asia/Tokyo", label: "Tokyo", region: "Asia" },
  { value: "Asia/Seoul", label: "Seoul", region: "Asia" },
  // Pacific
  { value: "Australia/Perth", label: "Perth", region: "Pacific" },
  { value: "Australia/Sydney", label: "Sydney", region: "Pacific" },
  { value: "Pacific/Auckland", label: "Auckland", region: "Pacific" },
  // UTC
  { value: "UTC", label: "UTC", region: "UTC" },
];

function getOffset(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = fmt.formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC";
  } catch {
    return "UTC";
  }
}

export default function TimezoneSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const timezones = useMemo<TZ[]>(
    () =>
      TIMEZONE_LIST.map((tz) => ({
        ...tz,
        offset: getOffset(tz.value),
      })),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return timezones;
    return timezones.filter(
      (tz) =>
        tz.label.toLowerCase().includes(q) ||
        tz.value.toLowerCase().includes(q) ||
        tz.offset.toLowerCase().includes(q) ||
        tz.region.toLowerCase().includes(q),
    );
  }, [timezones, query]);

  const selected = timezones.find((t) => t.value === value);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 text-sm transition-colors",
          "border-harmony-border-subtle bg-harmony-surface-1 text-harmony-fg",
          "hover:border-harmony-cta/50",
          open && "border-harmony-cta ring-2 ring-harmony-cta/20",
        )}
      >
        <span className="flex items-center gap-2">
          {selected ? (
            <>
              <span className="font-mono text-xs text-harmony-fg-secondary">
                {selected.offset}
              </span>
              <span>{selected.label}</span>
            </>
          ) : (
            <span className="text-harmony-fg-secondary">Select timezone…</span>
          )}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-harmony-border-subtle bg-harmony-surface-1 shadow-lg">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-harmony-border-subtle px-3 py-2">
            <Search size={14} className="shrink-0 text-harmony-fg-secondary" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search timezone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-harmony-fg placeholder:text-harmony-fg-secondary focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} type="button">
                <X size={13} className="text-harmony-fg-secondary" />
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-harmony-fg-secondary">
                No results
              </li>
            )}
            {filtered.map((tz) => (
              <li key={tz.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(tz.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-harmony-surface-2",
                    value === tz.value && "bg-harmony-cta/8 text-harmony-cta",
                  )}
                >
                  <span className="w-14 shrink-0 font-mono text-xs text-harmony-fg-secondary">
                    {tz.offset}
                  </span>
                  <span className="flex-1 text-left">{tz.label}</span>
                  <span className="text-xs text-harmony-fg-secondary">
                    {tz.region}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
