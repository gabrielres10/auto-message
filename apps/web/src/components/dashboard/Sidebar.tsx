"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { MessageSquareDot, LayoutDashboard, PlusCircle, LogOut, Menu, X } from "lucide-react";
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
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-harmony-cta shadow-glow-cta-xs">
          <MessageSquareDot size={15} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-gradient-cta text-sm font-semibold tracking-tight">
          Auto Message
        </span>
        <button
          className="ml-auto text-harmony-fg-secondary hover:text-harmony-fg md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-3 h-px bg-harmony-border-subtle" />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
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
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                active
                  ? "bg-harmony-cta-muted text-harmony-cta font-medium"
                  : "text-harmony-fg-secondary hover:text-harmony-fg hover:bg-harmony-surface-3",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-harmony-cta shadow-glow-cta-xs" />
              )}
              <Icon
                size={15}
                strokeWidth={active ? 2 : 1.5}
                className="shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mt-auto border-t border-harmony-border-subtle px-3 py-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-harmony-cta text-xs font-bold text-white shadow-glow-cta-xs">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            {userName && (
              <p className="truncate text-xs font-medium text-harmony-fg">{userName}</p>
            )}
            <p className="truncate text-xs text-harmony-fg-secondary">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-harmony-fg-secondary transition-colors hover:bg-harmony-surface-3 hover:text-harmony-fg"
          >
            <LogOut size={12} strokeWidth={1.5} />
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
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-harmony-border-subtle bg-harmony-surface-1 shadow-card md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={16} className="text-harmony-fg" />
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
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
