"use client";

import Link from "next/link";
import {
  Phone,
  Clock,
  Pause,
  Play,
  Trash2,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
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
  loading?: string | null; // id of message currently being mutated
}

const STATUS_BORDER: Record<string, string> = {
  ACTIVE: "border-l-emerald-500",
  PAUSED: "border-l-amber-400",
  COMPLETED: "border-l-harmony-fg-secondary",
  CANCELLED: "border-l-red-400",
};

const STATUS_BADGE: Record<
  string,
  "default" | "success" | "warning" | "error"
> = {
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
  const canToggle =
    message.status === "ACTIVE" || message.status === "PAUSED";
  const canDelete =
    message.status !== "CANCELLED";

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-harmony-border-subtle border-l-4 bg-harmony-surface-1 transition-shadow hover:shadow-sm",
        STATUS_BORDER[message.status] ?? "border-l-harmony-border-subtle",
      )}
    >
      <Link
        href={`/dashboard/messages/${message.id}`}
        className="block p-4 pb-3"
      >
        {/* Top row */}
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Phone size={13} className="mt-0.5 shrink-0 text-harmony-fg-secondary" strokeWidth={1.5} />
            <span className="font-mono text-sm font-medium text-harmony-fg">
              {message.phoneNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              label={message.status.toLowerCase()}
              variant={STATUS_BADGE[message.status] ?? "default"}
            />
            <ChevronRight
              size={14}
              className="text-harmony-fg-secondary opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>
        </div>

        {/* Message body */}
        <p className="mb-3 line-clamp-2 text-sm text-harmony-fg-secondary">
          {message.body}
        </p>

        {/* Schedule info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-harmony-fg-secondary">
          <span className="flex items-center gap-1.5">
            <Clock size={12} strokeWidth={1.5} />
            {describeSchedule(message)}
          </span>
          {message.nextRunAt && message.status === "ACTIVE" && (
            <span className="text-harmony-fg-secondary">
              Next: {formatRelative(message.nextRunAt)}
            </span>
          )}
          {message.totalExecutions > 0 && (
            <span className="flex items-center gap-1">
              <RotateCcw size={11} strokeWidth={1.5} />
              {message.totalExecutions} sent
            </span>
          )}
        </div>
      </Link>

      {/* Action buttons */}
      {(canToggle || canDelete) && (
        <div className="flex items-center justify-end gap-1 border-t border-harmony-border-subtle px-4 py-2">
          {canToggle && (
            <button
              disabled={isLoading}
              onClick={() =>
                message.status === "ACTIVE"
                  ? onPause(message.id)
                  : onResume(message.id)
              }
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                "text-harmony-fg-secondary hover:bg-harmony-surface-2 hover:text-harmony-fg",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {message.status === "ACTIVE" ? (
                <>
                  <Pause size={12} strokeWidth={1.5} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={12} strokeWidth={1.5} />
                  Resume
                </>
              )}
            </button>
          )}
          {canDelete && (
            <button
              disabled={isLoading}
              onClick={() => onDelete(message.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <Trash2 size={12} strokeWidth={1.5} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
