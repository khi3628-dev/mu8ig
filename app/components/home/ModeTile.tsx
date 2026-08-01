"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/learning/cn";

interface Props {
  href: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  highlight?: boolean;
}

export function ModeTile({ href, title, desc, Icon, highlight }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl p-4 border transition",
        "bg-[var(--card)] border-[var(--border)]",
        "hover:border-[var(--brand)] hover:shadow-sm",
        highlight && "ring-2 ring-[var(--accent)]/40",
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
          highlight
            ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
            : "bg-[var(--brand-muted)] text-[var(--brand)]",
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-[var(--muted-foreground)] truncate">
          {desc}
        </div>
      </div>
    </Link>
  );
}
