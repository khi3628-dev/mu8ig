"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROTATION, PROGRAM, type DayType, type Exercise } from "@/lib/workout/program";

interface DaySpec {
  dayType: string;
  label: string;
  focus: string;
  exercises: Exercise[];
}

interface WorkoutSession {
  id: string;
  dayType: string;
  completedAt: string;
  note: string | null;
}

const FOCUS_GRADIENT: Record<string, string> = {
  금비대: "from-blue-500 to-indigo-600",
  파워: "from-orange-500 to-amber-600",
  스트랭스: "from-rose-500 to-red-600",
};

const FOCUS_DOT: Record<string, string> = {
  금비대: "bg-blue-500",
  파워: "bg-orange-500",
  스트랭스: "bg-rose-500",
};

function focusOf(dayType: string): string {
  return PROGRAM[dayType as DayType]?.focus ?? "";
}

/** 같은 dayType이 로테이션상 다시 돌아와도 지난 회차 체크가 섞이지 않도록 날짜까지 키에 포함한다. */
function checkedStorageKey(dayType: string): string {
  const d = new Date();
  return `workout-checked-${dayType}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000
  );
  const time = date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

  if (diffDays === 0) return `오늘 ${time}`;
  if (diffDays === 1) return `어제 ${time}`;
  if (diffDays > 1 && diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function WorkoutPage() {
  const [next, setNext] = useState<DaySpec | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const response = await fetch("/api/workout");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNext(data.next);
      setCompletedCount(data.completedCount);
      setHistory(data.history ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "오늘의 운동을 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 오늘의 세션이 바뀔 때마다 그날 체크해둔 항목을 로컬에서 불러온다.
  useEffect(() => {
    if (!next) return;
    const saved = localStorage.getItem(checkedStorageKey(next.dayType));
    setChecked(saved ? new Set(JSON.parse(saved) as string[]) : new Set());
  }, [next]);

  const toggleChecked = (name: string) => {
    if (!next) return;
    setChecked((prev) => {
      const updated = new Set(prev);
      if (updated.has(name)) {
        updated.delete(name);
      } else {
        updated.add(name);
      }
      localStorage.setItem(
        checkedStorageKey(next.dayType),
        JSON.stringify([...updated])
      );
      return updated;
    });
  };

  const handleComplete = async () => {
    if (!next) return;
    setCompleting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayType: next.dayType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "기록에 실패했습니다.");
      localStorage.removeItem(checkedStorageKey(next.dayType));
      setNotice(`${next.label} 완료로 기록했습니다.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "기록에 실패했습니다.");
    } finally {
      setCompleting(false);
    }
  };

  const handleUndo = async (session: WorkoutSession) => {
    await fetch(`/api/workout/${session.id}`, { method: "DELETE" });
    await load();
  };

  const gradient = next ? FOCUS_GRADIENT[next.focus] : "from-zinc-700 to-zinc-900";
  const currentStep = completedCount % ROTATION.length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <header className={`bg-gradient-to-br ${gradient} text-white`}>
        <div className="max-w-2xl mx-auto px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-white/75 hover:text-white transition-colors"
          >
            ← 홈으로
          </Link>

          <p className="text-sm font-medium text-white/75 mt-4">
            근비대 DUP 프로그램
          </p>
          <h1 className="text-3xl font-bold mt-1 leading-tight">
            {next ? next.label.split(" · ")[0] : "불러오는 중..."}
          </h1>
          {next && (
            <p className="text-sm text-white/85 mt-2">
              {next.focus} 세션 · 지금까지 {completedCount}회 완료
            </p>
          )}

          <div className="flex gap-1.5 mt-6">
            {ROTATION.map((dayType, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div
                  key={dayType}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    done
                      ? "bg-white"
                      : active
                        ? "bg-white/90"
                        : "bg-white/25"
                  }`}
                  title={`${dayType} · ${PROGRAM[dayType].focus}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-white/60">
            {ROTATION.map((dayType) => (
              <span key={dayType}>{dayType}</span>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6 pb-32">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-5">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        {notice && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-5">
            <p className="text-green-700 dark:text-green-400 text-sm">
              {notice}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-zinc-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && next && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm shadow-zinc-200/50 dark:shadow-none p-5 mb-6 -mt-8 relative">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                오늘의 운동
              </h2>
              <span className="text-xs font-medium text-zinc-400 tabular-nums">
                {checked.size}/{next.exercises.length}개 완료
              </span>
            </div>
            <ul className="grid gap-1">
              {next.exercises.map((exercise) => {
                const isChecked = checked.has(exercise.name);
                return (
                  <li
                    key={exercise.name}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChecked(exercise.name)}
                      className="w-full flex items-center gap-3 py-3 text-left group"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 group-active:scale-90 ${
                          isChecked
                            ? `${FOCUS_DOT[next.focus]} border-transparent`
                            : "border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400 dark:group-hover:border-zinc-500"
                        }`}
                      >
                        {isChecked && <CheckIcon />}
                      </span>

                      <span
                        className={`flex-1 min-w-0 font-medium transition-colors ${
                          isChecked
                            ? "text-zinc-400 dark:text-zinc-600 line-through"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {exercise.name}
                        {exercise.note && (
                          <span className="block text-zinc-400 text-xs font-normal mt-0.5 no-underline">
                            {exercise.note}
                          </span>
                        )}
                      </span>

                      <span
                        className={`text-right shrink-0 transition-opacity ${isChecked ? "opacity-40" : ""}`}
                      >
                        {exercise.weightKg && (
                          <span className="block text-lg font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
                            {exercise.weightKg}kg
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {exercise.sets}세트 x {exercise.reps}회
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          최근 기록
        </h2>
        {!loading && history.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">
            아직 완료한 세션이 없습니다.
          </p>
        ) : (
          <ul className="grid gap-2">
            {history.map((session) => (
              <li
                key={session.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      FOCUS_DOT[focusOf(session.dayType)] ?? "bg-zinc-400"
                    }`}
                  />
                  <div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {session.dayType}
                    </span>
                    <span className="text-xs text-zinc-400 ml-2">
                      {formatRelative(session.completedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleUndo(session)}
                  className="px-3 py-1.5 text-xs rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  취소
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {!loading && next && (
        <div className="fixed bottom-0 inset-x-0 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleComplete}
              disabled={completing}
              className={`w-full py-3.5 rounded-full text-white text-base font-semibold bg-gradient-to-br ${gradient} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-md`}
            >
              {completing ? "기록 중..." : "오늘 운동 완료"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
