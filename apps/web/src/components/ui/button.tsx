import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harmony-cta/60 focus-visible:ring-offset-1 focus-visible:ring-offset-harmony-surface-2",
    "disabled:pointer-events-none disabled:opacity-40",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-harmony-cta text-white",
          "shadow-glow-cta-xs hover:shadow-glow-cta",
          "hover:brightness-110 active:brightness-95 active:scale-[0.98]",
        ].join(" "),
        outline: [
          "border border-harmony-border-subtle bg-harmony-surface-1 text-harmony-fg",
          "hover:bg-harmony-surface-3 hover:border-harmony-fg-secondary/30",
          "active:scale-[0.98]",
        ].join(" "),
        ghost: [
          "text-harmony-fg-secondary",
          "hover:text-harmony-fg hover:bg-harmony-surface-3",
          "active:scale-[0.98]",
        ].join(" "),
        destructive: [
          "border border-red-800/50 bg-red-950/40 text-red-400",
          "hover:bg-red-950/70 hover:border-red-700/60 hover:text-red-300",
          "active:scale-[0.98]",
        ].join(" "),
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
