"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MessageSquare,
  LayoutDashboard,
  PlusCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface SidebarProps {
  userName?: string | null;
  userEmail?: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/messages/new", icon: PlusCircle, label: "New Schedule" },
];

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initial = (userName ?? userEmail ?? "U")[0].toUpperCase();

  const content = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-harmony-border-subtle px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-harmony-cta">
          <MessageSquare size={15} className="text-white" strokeWidth={1.5} />
        </div>
        <span className="font-semibold text-harmony-fg">Auto Message</span>
        <button
          className="ml-auto text-harmony-fg-secondary hover:text-harmony-fg md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-harmony-cta/10 text-harmony-cta font-medium"
                  : "text-harmony-fg-secondary hover:text-harmony-fg hover:bg-harmony-surface-2",
              )}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-harmony-border-subtle p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-harmony-cta text-xs font-semibold text-white">
            {initial}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs text-harmony-fg-secondary">
            {userEmail}
          </span>
        </div>
        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-harmony-fg-secondary transition-colors hover:bg-harmony-surface-2 hover:text-harmony-fg"
          >
            <LogOut size={13} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-harmony-border-subtle bg-harmony-surface-1 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={16} className="text-harmony-fg" />
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 border-r border-harmony-border-subtle bg-harmony-surface-1 transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {content}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-harmony-border-subtle bg-harmony-surface-1 md:flex md:flex-col">
        {content}
      </aside>
    </>
  );
}
