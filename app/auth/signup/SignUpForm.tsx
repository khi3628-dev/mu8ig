"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined, dateOfBirth: dob }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "email_taken") {
          setError("이미 가입된 이메일입니다.");
        } else if (data.issues?.fieldErrors?.dateOfBirth) {
          setError(data.issues.fieldErrors.dateOfBirth[0]);
        } else if (data.issues?.fieldErrors?.password) {
          setError("비밀번호는 최소 8자 이상이어야 합니다.");
        } else {
          setError("입력값을 확인해주세요.");
        }
        setSubmitting(false);
        return;
      }
      // Auto sign-in after signup
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      setSubmitting(false);
      if (!signInRes?.ok) {
        router.push("/auth/signin");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="signup-name"
          className="block text-xs text-(--muted-foreground) mb-1"
        >
          이름 (선택)
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="signup-email"
          className="block text-xs text-(--muted-foreground) mb-1"
        >
          이메일
        </label>
        <input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="signup-password"
          className="block text-xs text-(--muted-foreground) mb-1"
        >
          비밀번호 (최소 8자)
        </label>
        <input
          id="signup-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="signup-dob"
          className="block text-xs text-(--muted-foreground) mb-1"
        >
          생년월일 (만 18세 이상)
        </label>
        <input
          id="signup-dob"
          type="date"
          required
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full rounded-md border border-(--border) bg-(--background) px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center rounded-md bg-(--brand) text-(--brand-foreground) px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "가입 중..." : "가입하기"}
      </button>
      <p className="text-[11px] text-(--muted-foreground) text-center">
        본 사이트는 시뮬레이션입니다. 실제 금전이 이동하지 않습니다.
      </p>
    </form>
  );
}
