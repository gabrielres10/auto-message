import { cn } from "@/lib/utils";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const PADDING: Record<NonNullable<PanelProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

export function Panel({ children, className, padding = "md", hover = false }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-harmony-border-subtle bg-harmony-surface-1 shadow-card",
        hover && "transition-all duration-200 hover:shadow-card-hover hover:border-harmony-fg-secondary/20",
        PADDING[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
