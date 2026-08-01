import type { HTMLAttributes } from "react";
import { cn } from "@/lib/learning/cn";

export function Card({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-sm",
        className,
      )}
      {...rest}
    />
  );
}
