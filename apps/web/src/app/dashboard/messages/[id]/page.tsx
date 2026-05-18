import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Clock, Calendar, RotateCcw } from "lucide-react";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import ExecutionHistory from "@/components/dashboard/ExecutionHistory";
import MessageActions from "@/components/dashboard/MessageActions";
import { describeSchedule, formatAbsolute, formatRelative } from "@/lib/message-utils";
import type { SerializedMessage, SerializedExecution } from "@/lib/message-utils";

export const metadata = { title: "Schedule detail" };

type Params = { params: Promise<{ id: string }> };

const STATUS_BADGE: Record<string, "default" | "success" | "warning" | "error"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "default",
  CANCELLED: "error",
};

export default async function MessageDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const message = await db.scheduledMessage.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    include: {
      recurrenceRule: true,
      executions: { orderBy: { scheduledFor: "desc" } },
    },
  });

  if (!message) notFound();

  const serialized: SerializedMessage = JSON.parse(JSON.stringify(message));
  const executions: SerializedExecution[] = serialized.executions;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      {/* Back */}
      <div className="mb-6 pl-10 md:pl-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-harmony-fg-secondary transition-colors hover:text-harmony-fg"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to dashboard
        </Link>
      </div>

      {/* Header card */}
      <Panel padding="md" className="mb-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Phone size={15} className="shrink-0 text-harmony-fg-secondary" strokeWidth={1.5} />
            <span className="font-mono font-medium text-harmony-fg">
              {message.phoneNumber}
            </span>
          </div>
          <Badge
            label={message.status.toLowerCase()}
            variant={STATUS_BADGE[message.status] ?? "default"}
          />
        </div>

        {/* Message preview */}
        <div className="rounded-lg bg-harmony-surface-2 px-4 py-3 text-sm text-harmony-fg">
          {message.body}
        </div>

        {/* Schedule meta */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetaRow icon={Clock} label="Schedule">
            {describeSchedule(serialized)}
          </MetaRow>

          {message.timezone && (
            <MetaRow icon={Calendar} label="Timezone">
              {message.timezone}
            </MetaRow>
          )}

          {message.nextRunAt && message.status === "ACTIVE" && (
            <MetaRow icon={Clock} label="Next run">
              {formatRelative(serialized.nextRunAt!)}
            </MetaRow>
          )}

          {message.lastRunAt && (
            <MetaRow icon={RotateCcw} label="Last run">
              {formatAbsolute(serialized.lastRunAt!)}
            </MetaRow>
          )}

          <MetaRow icon={RotateCcw} label="Total sent">
            {message.totalExecutions} message
            {message.totalExecutions !== 1 ? "s" : ""}
          </MetaRow>

          <MetaRow icon={Calendar} label="Created">
            {formatAbsolute(serialized.createdAt)}
          </MetaRow>
        </div>

        {/* Actions */}
        <MessageActions message={serialized} />
      </Panel>

      {/* Execution history */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-harmony-fg">
          Execution History
        </h2>
        <ExecutionHistory executions={executions} />
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="mt-0.5 shrink-0 text-harmony-fg-secondary" strokeWidth={1.5} />
      <div>
        <p className="text-xs text-harmony-fg-secondary">{label}</p>
        <p className="text-sm text-harmony-fg">{children}</p>
      </div>
    </div>
  );
}
