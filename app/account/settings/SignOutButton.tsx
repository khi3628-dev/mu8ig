"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center rounded-md border border-(--border) px-4 py-2 text-sm hover:bg-(--muted)"
    >
      로그아웃
    </button>
  );
}
