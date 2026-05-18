"use client";

import { CheckCircle2, XCircle, Clock, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SerializedExecution } from "@/lib/message-utils";
import { formatAbsolute } from "@/lib/message-utils";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    classes: string;
  }
> = {
  SENT: {
    label: "Sent",
    icon: CheckCircle2,
    classes: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  },
  FAILED: {
    label: "Failed",
    icon: XCircle,
    classes: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
  },
  QUEUED: {
    label: "Queued",
    icon: Clock,
    classes: "text-harmony-fg-secondary bg-harmony-surface-2",
  },
  PROCESSING: {
    label: "Processing",
    icon: Loader2,
    classes: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    classes: "text-harmony-fg-secondary bg-harmony-surface-2",
  },
  RETRYING: {
    label: "Retrying",
    icon: RotateCcw,
    classes: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    classes: "text-harmony-fg-secondary bg-harmony-surface-2",
  },
};

interface ExecutionHistoryProps {
  executions: SerializedExecution[];
}

export default function ExecutionHistory({ executions }: ExecutionHistoryProps) {
  if (executions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-harmony-fg-secondary">No executions yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-harmony-border-subtle">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-harmony-border-subtle bg-harmony-surface-2">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-harmony-fg-secondary">
              Scheduled for
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-harmony-fg-secondary">
              Status
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-harmony-fg-secondary sm:table-cell">
              Completed
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-harmony-fg-secondary md:table-cell">
              Attempt
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-harmony-border-subtle bg-harmony-surface-1">
          {executions.map((ex) => {
            const cfg = STATUS_CONFIG[ex.status] ?? STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;
            return (
              <tr key={ex.id} className="hover:bg-harmony-surface-2/50">
                <td className="px-4 py-3 font-mono text-xs text-harmony-fg">
                  {formatAbsolute(ex.scheduledFor)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        "inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                        cfg.classes,
                      )}
                    >
                      <Icon
                        size={11}
                        strokeWidth={1.5}
                        className={
                          ex.status === "PROCESSING" ? "animate-spin" : ""
                        }
                      />
                      {cfg.label}
                    </span>
                    {ex.errorMessage && (
                      <span className="text-xs text-red-500 dark:text-red-400">
                        {ex.errorMessage}
                      </span>
                    )}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-xs text-harmony-fg-secondary sm:table-cell">
                  {ex.completedAt ? formatAbsolute(ex.completedAt) : "—"}
                </td>
                <td className="hidden px-4 py-3 text-xs text-harmony-fg-secondary md:table-cell">
                  #{ex.attempt}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
