import { cn } from "@/lib/utils";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING: Record<NonNullable<PanelProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

export function Panel({ children, className, padding = "md" }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-harmony-border-subtle bg-harmony-surface-1",
        PADDING[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
