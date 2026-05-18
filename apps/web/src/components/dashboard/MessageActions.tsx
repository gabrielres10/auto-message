"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SerializedMessage } from "@/lib/message-utils";

interface MessageActionsProps {
  message: SerializedMessage;
}

export default function MessageActions({ message }: MessageActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canToggle = message.status === "ACTIVE" || message.status === "PAUSED";
  const canDelete = message.status !== "CANCELLED";

  if (!canToggle && !canDelete) return null;

  async function mutate(action: "pause" | "resume" | "delete") {
    setLoading(action);
    setError(null);
    try {
      const res =
        action === "delete"
          ? await fetch(`/api/messages/${message.id}`, { method: "DELETE" })
          : await fetch(`/api/messages/${message.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action }),
            });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }

      if (action === "delete") {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {canToggle &&
          (message.status === "ACTIVE" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={loading !== null}
              onClick={() => mutate("pause")}
            >
              {loading === "pause" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Pause size={13} strokeWidth={1.5} />
              )}
              Pause schedule
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={loading !== null}
              onClick={() => mutate("resume")}
            >
              {loading === "resume" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} strokeWidth={1.5} />
              )}
              Resume schedule
            </Button>
          ))}

        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading !== null}
            onClick={() => mutate("delete")}
            className="text-red-600 hover:border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {loading === "delete" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} strokeWidth={1.5} />
            )}
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
