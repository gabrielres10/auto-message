"use client";

import Link from "next/link";
import { Phone, Clock, Pause, Play, Trash2, RotateCcw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  type SerializedMessage,
  describeSchedule,
  formatRelative,
} from "@/lib/message-utils";

interface MessageCardProps {
  message: SerializedMessage;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: string | null;
}

const STATUS_GLOW: Record<string, string> = {
  ACTIVE: "before:bg-emerald-500",
  PAUSED: "before:bg-amber-400",
  COMPLETED: "before:bg-harmony-fg-secondary",
  CANCELLED: "before:bg-red-500",
};

const STATUS_BADGE: Record<string, "default" | "success" | "warning" | "error"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "default",
  CANCELLED: "error",
};

export default function MessageCard({
  message,
  onPause,
  onResume,
  onDelete,
  loading,
}: MessageCardProps) {
  const isLoading = loading === message.id;
  const canToggle = message.status === "ACTIVE" || message.status === "PAUSED";
  const canDelete = message.status !== "CANCELLED";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-harmony-border-subtle bg-harmony-surface-1 shadow-card",
        "transition-all duration-200 hover:shadow-card-hover hover:border-harmony-fg-secondary/25",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-0.5 before:rounded-r-full before:content-['']",
        STATUS_GLOW[message.status] ?? "before:bg-harmony-border-subtle",
        isLoading && "opacity-60",
      )}
    >
      <Link href={`/dashboard/messages/${message.id}`} className="block px-5 py-4">
        {/* Top row */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Phone size={12} className="shrink-0 text-harmony-fg-secondary" strokeWidth={1.5} />
            <span className="font-mono text-sm font-semibold text-harmony-fg tracking-tight">
              {message.phoneNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              label={message.status.toLowerCase()}
              variant={STATUS_BADGE[message.status] ?? "default"}
            />
            <ArrowRight
              size={13}
              className="text-harmony-fg-secondary/0 transition-all duration-200 group-hover:text-harmony-fg-secondary group-hover:translate-x-0.5"
            />
          </div>
        </div>

        {/* Message body */}
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-harmony-fg-secondary">
          {message.body}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-harmony-fg-secondary">
          <span className="flex items-center gap-1.5 font-medium text-harmony-fg-secondary">
            <Clock size={11} strokeWidth={1.5} />
            {describeSchedule(message)}
          </span>
          {message.nextRunAt && message.status === "ACTIVE" && (
            <span className="text-harmony-cta/80">
              Next: {formatRelative(message.nextRunAt)}
            </span>
          )}
          {message.totalExecutions > 0 && (
            <span className="flex items-center gap-1">
              <RotateCcw size={10} strokeWidth={1.5} />
              {message.totalExecutions} sent
            </span>
          )}
        </div>
      </Link>

      {/* Action bar */}
      {(canToggle || canDelete) && (
        <div className="flex items-center justify-end gap-1 border-t border-harmony-border-subtle bg-harmony-surface-2/50 px-4 py-2">
          {canToggle && (
            <button
              disabled={isLoading}
              onClick={() =>
                message.status === "ACTIVE" ? onPause(message.id) : onResume(message.id)
              }
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                "text-harmony-fg-secondary hover:text-harmony-fg hover:bg-harmony-surface-3",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              {message.status === "ACTIVE" ? (
                <><Pause size={11} strokeWidth={2} /> Pause</>
              ) : (
                <><Play size={11} strokeWidth={2} /> Resume</>
              )}
            </button>
          )}
          {canDelete && (
            <button
              disabled={isLoading}
              onClick={() => onDelete(message.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                "text-red-500/70 hover:text-red-400 hover:bg-red-950/30",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              <Trash2 size={11} strokeWidth={1.5} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
