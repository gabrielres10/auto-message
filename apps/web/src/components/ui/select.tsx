import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full appearance-none rounded-lg border border-harmony-border-subtle",
          "bg-harmony-surface-1 px-3 py-1 pr-8 text-sm text-harmony-fg",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harmony-cta focus-visible:border-harmony-cta",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-harmony-fg-secondary"
      />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
