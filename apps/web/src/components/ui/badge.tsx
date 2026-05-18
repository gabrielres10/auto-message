import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "error";
  dot?: boolean;
  className?: string;
}

const VARIANTS: Record<
  NonNullable<BadgeProps["variant"]>,
  { badge: string; dot: string }
> = {
  default: {
    badge: "bg-harmony-surface-3 text-harmony-fg-secondary border-harmony-border-subtle",
    dot: "bg-harmony-fg-secondary",
  },
  success: {
    badge: "bg-emerald-950/60 text-emerald-400 border-emerald-900/60",
    dot: "bg-emerald-400",
  },
  warning: {
    badge: "bg-amber-950/60 text-amber-400 border-amber-900/60",
    dot: "bg-amber-400",
  },
  error: {
    badge: "bg-red-950/60 text-red-400 border-red-900/60",
    dot: "bg-red-400",
  },
};

export function Badge({ label, variant = "default", dot = true, className }: BadgeProps) {
  const cfg = VARIANTS[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.badge,
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      )}
      {label}
    </span>
  );
}
