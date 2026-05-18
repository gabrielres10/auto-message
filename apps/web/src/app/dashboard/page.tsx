import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import WhatsAppStatus from "@/components/dashboard/WhatsAppStatus";
import MessageList from "@/components/dashboard/MessageList";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;

  const [total, active, paused, completed] = await Promise.all([
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null } }),
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null, status: "ACTIVE" } }),
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null, status: "PAUSED" } }),
    db.scheduledMessage.count({ where: { userId: uid, deletedAt: null, status: "COMPLETED" } }),
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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="pl-10 md:pl-0">
          <h1 className="text-xl font-semibold text-harmony-fg">Schedules</h1>
          <p className="mt-0.5 text-sm text-harmony-fg-secondary">
            Manage your WhatsApp message schedules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <WhatsAppStatus />
          <Link href="/dashboard/messages/new">
            <Button size="sm">
              <Plus size={14} strokeWidth={2.5} />
              New Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={total} color="default" />
        <StatCard label="Active" value={active} color="green" />
        <StatCard label="Paused" value={paused} color="amber" />
        <StatCard label="Completed" value={completed} color="muted" />
      </div>

      {/* Message list */}
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
  color: "default" | "green" | "amber" | "muted";
}) {
  const valueColors = {
    default: "text-harmony-fg",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    muted: "text-harmony-fg-secondary",
  };
  return (
    <Panel padding="md">
      <p className="text-xs font-medium uppercase tracking-wider text-harmony-fg-secondary">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-bold tabular-nums", valueColors[color])}>
        {value}
      </p>
    </Panel>
  );
}
