import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg border border-harmony-border-subtle",
        "bg-harmony-surface-1 px-3 py-1 text-sm text-harmony-fg",
        "placeholder:text-harmony-fg-secondary",
        "transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harmony-cta",
        "focus-visible:border-harmony-cta",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
