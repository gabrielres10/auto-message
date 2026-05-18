"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MessageCard from "./MessageCard";
import type { SerializedMessage } from "@/lib/message-utils";

type Filter = "ALL" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PAUSED", label: "Paused" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

interface MessageListProps {
  initialMessages: SerializedMessage[];
}

export default function MessageList({ initialMessages }: MessageListProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map: Record<Filter, number> = {
      ALL: messages.length,
      ACTIVE: 0, PAUSED: 0, COMPLETED: 0, CANCELLED: 0,
    };
    for (const m of messages) {
      const s = m.status as Exclude<Filter, "ALL">;
      if (s in map) map[s]++;
    }
    return map;
  }, [messages]);

  const visible = useMemo(
    () => (filter === "ALL" ? messages : messages.filter((m) => m.status === filter)),
    [messages, filter],
  );

  const mutate = useCallback(
    async (id: string, method: "PATCH" | "DELETE", body?: Record<string, unknown>) => {
      setLoading(id);
      setError(null);
      try {
        const res = await fetch(`/api/messages/${id}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error((json as { error?: string }).error ?? "Request failed");
        }
        if (method === "DELETE") {
          setMessages((prev) => prev.filter((m) => m.id !== id));
        } else {
          const updated: SerializedMessage = await res.json();
          setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(null);
      }
    },
    [],
  );

  return (
    <div className="animate-slide-up">
      {/* Filter tabs */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                active
                  ? "bg-harmony-cta-muted text-harmony-cta shadow-glow-cta-xs"
                  : "text-harmony-fg-secondary hover:text-harmony-fg hover:bg-harmony-surface-3",
              )}
            >
              {label}
              <span
                className={cn(
                  "min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-harmony-cta/20 text-harmony-cta"
                    : "bg-harmony-surface-3 text-harmony-fg-secondary",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="mb-3 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-harmony-border-subtle py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-harmony-surface-3">
            <CalendarDays size={22} strokeWidth={1} className="text-harmony-fg-secondary" />
          </div>
          <div>
            <p className="font-medium text-harmony-fg">
              {filter === "ALL" ? "No schedules yet" : `No ${filter.toLowerCase()} schedules`}
            </p>
            <p className="mt-1 text-sm text-harmony-fg-secondary">
              {filter === "ALL"
                ? "Create your first scheduled WhatsApp message"
                : "Try a different filter"}
            </p>
          </div>
          {filter === "ALL" && (
            <Link href="/dashboard/messages/new">
              <Button size="sm" variant="outline">
                <Plus size={13} strokeWidth={2.5} />
                New Schedule
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              onPause={(id) => mutate(id, "PATCH", { action: "pause" })}
              onResume={(id) => mutate(id, "PATCH", { action: "resume" })}
              onDelete={(id) => mutate(id, "DELETE")}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
