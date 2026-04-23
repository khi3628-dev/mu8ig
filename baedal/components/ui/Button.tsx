import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-(--brand) text-(--brand-foreground) hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-(--muted) text-(--foreground) hover:bg-(--border) disabled:opacity-50",
  ghost:
    "bg-transparent hover:bg-(--muted) text-(--foreground) disabled:opacity-50",
  danger:
    "bg-(--danger) text-white hover:opacity-90 disabled:opacity-50",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-5 text-base rounded-lg font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
});
