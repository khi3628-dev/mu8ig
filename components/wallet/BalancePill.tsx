"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAccountStore } from "@/state/accountStore";
import { senToMyr } from "@/lib/currency";

export function BalancePill() {
  const { status } = useSession();
  const balance = useAccountStore((s) => s.walletBalanceSen);
  const fetchMe = useAccountStore((s) => s.fetchMe);
  const reset = useAccountStore((s) => s.reset);

  useEffect(() => {
    if (status === "authenticated") void fetchMe();
    else if (status === "unauthenticated") reset();
  }, [status, fetchMe, reset]);

  if (status !== "authenticated") return null;

  return (
    <Link
      href="/account/wallet"
      className="hidden sm:inline-flex items-center gap-1 rounded-md border border-(--border) px-2.5 py-1 text-xs font-medium hover:bg-(--muted) tabular-nums"
      aria-label="지갑 잔액"
    >
      <span aria-hidden="true">💰</span>
      {balance != null ? senToMyr(balance) : "—"}
    </Link>
  );
}
