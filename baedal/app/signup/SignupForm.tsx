"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/";
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "가입에 실패했어요.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [k]: e.target.value });

  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      <h1 className="text-xl font-bold mb-6">회원가입</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium">이메일</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={set("email")}
            className="mt-1 w-full h-10 px-3 rounded-md border border-(--border) bg-(--background)"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">비밀번호 (6자 이상)</span>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={set("password")}
            className="mt-1 w-full h-10 px-3 rounded-md border border-(--border) bg-(--background)"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">이름</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={set("name")}
            className="mt-1 w-full h-10 px-3 rounded-md border border-(--border) bg-(--background)"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">휴대폰 (선택)</span>
          <input
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            className="mt-1 w-full h-10 px-3 rounded-md border border-(--border) bg-(--background)"
            placeholder="010-0000-0000"
          />
        </label>
        {error ? <p className="text-sm text-(--danger)">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "처리 중…" : "가입하기"}
        </Button>
      </form>
      <p className="text-sm text-(--muted-foreground) mt-4 text-center">
        이미 계정이 있나요?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-(--brand) font-medium"
        >
          로그인
        </Link>
      </p>
    </div>
  );
}
