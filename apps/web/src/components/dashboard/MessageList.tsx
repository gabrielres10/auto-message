"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageCard from "./MessageCard";
import type { SerializedMessage } from "@/lib/message-utils";

interface MessageListProps {
  initialMessages: SerializedMessage[];
}

export default function MessageList({ initialMessages }: MessageListProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (
      id: string,
      method: "PATCH" | "DELETE",
      body?: Record<string, unknown>,
    ) => {
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
          throw new Error(json.error ?? "Request failed");
        }
        if (method === "DELETE") {
          setMessages((prev) => prev.filter((m) => m.id !== id));
        } else {
          const updated: SerializedMessage = await res.json();
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? updated : m)),
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(null);
      }
    },
    [],
  );

  const handlePause = (id: string) =>
    mutate(id, "PATCH", { action: "pause" });
  const handleResume = (id: string) =>
    mutate(id, "PATCH", { action: "resume" });
  const handleDelete = (id: string) => mutate(id, "DELETE");

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-harmony-border-subtle py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-harmony-surface-2">
          <CalendarDays size={24} strokeWidth={1} className="text-harmony-fg-secondary" />
        </div>
        <div>
          <p className="font-medium text-harmony-fg">No schedules yet</p>
          <p className="mt-1 text-sm text-harmony-fg-secondary">
            Create your first scheduled WhatsApp message
          </p>
        </div>
        <Link href="/dashboard/messages/new">
          <Button size="sm" variant="outline">
            <Plus size={14} strokeWidth={2.5} />
            New Schedule
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}
      {messages.map((msg) => (
        <MessageCard
          key={msg.id}
          message={msg}
          onPause={handlePause}
          onResume={handleResume}
          onDelete={handleDelete}
          loading={loading}
        />
      ))}
    </div>
  );
}
