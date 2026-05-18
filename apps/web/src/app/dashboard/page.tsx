import { redirect } from "next/navigation";
import { CalendarDays, MessageSquare } from "lucide-react";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Panel } from "@/components/ui/panel";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import LogoutButton from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [total, active, completed, cancelled] = await Promise.all([
    db.scheduledMessage.count({ where: { userId: session.user.id, deletedAt: null } }),
    db.scheduledMessage.count({ where: { userId: session.user.id, status: "ACTIVE", deletedAt: null } }),
    db.scheduledMessage.count({ where: { userId: session.user.id, status: "COMPLETED", deletedAt: null } }),
    db.scheduledMessage.count({ where: { userId: session.user.id, status: "CANCELLED", deletedAt: null } }),
  ]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] ?? session.user.email;

  return (
    <div className="min-h-dvh">
      {/* Top navigation */}
      <header className="sticky top-0 z-10 border-b border-harmony-border-subtle bg-harmony-surface-1">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-harmony-cta">
              <MessageSquare size={14} className="text-white" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold text-harmony-fg">
              Auto Message
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <span className="mx-2 hidden text-sm text-harmony-fg-secondary sm:block">
              {session.user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-harmony-fg">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-harmony-fg-secondary">
            Here&apos;s an overview of your scheduled messages.
          </p>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPanel label="Total" value={total} />
          <StatPanel
            label="Active"
            value={active}
            valueClass="text-amber-500 dark:text-amber-400"
          />
          <StatPanel
            label="Completed"
            value={completed}
            valueClass="text-emerald-600 dark:text-emerald-400"
          />
          <StatPanel
            label="Cancelled"
            value={cancelled}
            valueClass="text-harmony-fg-secondary"
          />
        </div>

        {/* Empty state / future content area */}
        <Panel
          padding="lg"
          className="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
        >
          <CalendarDays
            size={32}
            strokeWidth={1}
            className="text-harmony-fg-secondary"
          />
          <div>
            <p className="text-sm font-medium text-harmony-fg">
              No messages scheduled
            </p>
            <p className="mt-0.5 text-xs text-harmony-fg-secondary">
              Create your first scheduled message to get started.
            </p>
          </div>
        </Panel>
      </main>
    </div>
  );
}

function StatPanel({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <Panel padding="md">
      <p className="text-xs font-medium uppercase tracking-wider text-harmony-fg-secondary">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-bold text-harmony-fg", valueClass)}>
        {value}
      </p>
    </Panel>
  );
}
