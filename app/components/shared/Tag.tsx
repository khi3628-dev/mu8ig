import type { HTMLAttributes } from "react";
import { cn } from "@/lib/learning/cn";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "brand" | "accent" | "success" | "danger";
}

const styles = {
  default: "bg-[var(--muted)] text-[var(--foreground)]",
  brand: "bg-[var(--brand-muted)] text-[var(--brand)]",
  accent: "bg-[var(--accent)]/10 text-[var(--accent)]",
  success: "bg-[var(--success)]/10 text-[var(--success)]",
  danger: "bg-[var(--danger)]/10 text-[var(--danger)]",
};

export function Tag({ variant = "default", className, ...rest }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
      {...rest}
    />
  );
}
