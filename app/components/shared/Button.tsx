"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/learning/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-foreground)] hover:opacity-90 active:opacity-80",
  secondary:
    "bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--border)]",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  danger:
    "bg-[var(--danger)] text-white hover:opacity-90",
  accent:
    "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-base rounded-xl",
  lg: "h-14 px-6 text-lg rounded-2xl font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    fullWidth,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : null}
      {children}
    </button>
  );
});
