import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex w-full rounded-lg border border-harmony-border-subtle",
        "bg-harmony-surface-1 px-3 py-2 text-sm text-harmony-fg",
        "placeholder:text-harmony-fg-secondary",
        "transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harmony-cta focus-visible:border-harmony-cta",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-none",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
