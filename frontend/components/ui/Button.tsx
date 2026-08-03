"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90 disabled:bg-accent/50",
  secondary: "border border-line bg-surface text-ink hover:bg-line/40",
  danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-muted hover:text-ink hover:bg-line/40",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-70",
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <span className="text-xs">Saving…</span> : children}
    </button>
  );
});
