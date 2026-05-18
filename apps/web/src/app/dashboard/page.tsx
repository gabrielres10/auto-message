import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WhatsAppStatus from "@/components/dashboard/WhatsAppStatus";
import MessageList from "@/components/dashboard/MessageList";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;

  const [total, active, paused, completed, cancelled] = await Promise.all([
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null } }),
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null, status: "ACTIVE" } }),
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null, status: "PAUSED" } }),
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null, status: "COMPLETED" } }),
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null, status: "CANCELLED" } }),
  ]);

  const messages = await db.scheduledMessage.findMany({
    where: { userId: uid, deletedAt: null },
    include: {
      recurrenceRule: true,
      executions: { orderBy: { scheduledFor: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="pl-10 md:pl-0">
          <h1 className="text-xl font-semibold text-harmony-fg">Schedules</h1>
          <p className="mt-0.5 text-sm text-harmony-fg-secondary">
            Manage your WhatsApp message schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WhatsAppStatus />
          <Link href="/dashboard/messages/new">
            <Button size="sm">
              <Plus size={13} strokeWidth={2.5} />
              New Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={total} color="default" />
        <StatCard label="Active" value={active} color="green" />
        <StatCard label="Paused" value={paused} color="amber" />
        <StatCard label="Completed" value={completed} color="muted" />
        <StatCard label="Cancelled" value={cancelled} color="red" />
      </div>

      {/* Message list with filter */}
      <MessageList initialMessages={JSON.parse(JSON.stringify(messages))} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "default" | "green" | "amber" | "muted" | "red";
}) {
  const styles = {
    default: {
      card: "border-harmony-border-subtle",
      value: "text-harmony-fg",
      label: "text-harmony-fg-secondary",
      bar: "bg-harmony-cta/60",
    },
    green: {
      card: "border-emerald-900/60",
      value: "text-emerald-400",
      label: "text-emerald-600 dark:text-emerald-600",
      bar: "bg-emerald-500",
    },
    amber: {
      card: "border-amber-900/60",
      value: "text-amber-400",
      label: "text-amber-600 dark:text-amber-600",
      bar: "bg-amber-500",
    },
    muted: {
      card: "border-harmony-border-subtle",
      value: "text-harmony-fg-secondary",
      label: "text-harmony-fg-secondary/60",
      bar: "bg-harmony-fg-secondary/40",
    },
    red: {
      card: "border-red-900/60",
      value: "text-red-400",
      label: "text-red-600 dark:text-red-600",
      bar: "bg-red-500",
    },
  };
  const s = styles[color];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-harmony-surface-1 p-4 shadow-card",
        s.card,
      )}
    >
      <div
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-full opacity-60",
          s.bar,
        )}
      />
      <p className={cn("text-[11px] font-semibold uppercase tracking-wider", s.label)}>
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-bold tabular-nums", s.value)}>
        {value}
      </p>
    </div>
  );
}
