"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/";
  const [email, setEmail] = useState("demo@baedal.dev");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "로그인에 실패했어요.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      <h1 className="text-xl font-bold mb-6">로그인</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium">이메일</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-md border border-(--border) bg-(--background)"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">비밀번호</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-md border border-(--border) bg-(--background)"
          />
        </label>
        {error ? <p className="text-sm text-(--danger)">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "로그인 중…" : "로그인"}
        </Button>
      </form>
      <p className="text-sm text-(--muted-foreground) mt-4 text-center">
        계정이 없나요?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="text-(--brand) font-medium"
        >
          회원가입
        </Link>
      </p>
      <p className="text-xs text-(--muted-foreground) mt-6 text-center">
        데모 계정: demo@baedal.dev / demo1234
      </p>
    </div>
  );
}
