"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weightKg?: number;
  note?: string;
}

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

const FOCUS_COLORS: Record<string, string> = {
  금비대: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  파워: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  스트랭스: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function WorkoutPage() {
  const [next, setNext] = useState<DaySpec | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            근비대 DUP 프로그램
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            금비대 → 파워 → 스트랭스 순으로 순환하는 6세션 로테이션
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            ← 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        {notice && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
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
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      FOCUS_COLORS[next.focus] ??
                      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {next.focus}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {next.dayType} · 지금까지 {completedCount}세션 완료
                  </span>
                </div>
                <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                  오늘: {next.label}
                </h2>
              </div>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="shrink-0 px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {completing ? "기록 중..." : "오늘 운동 완료"}
              </button>
            </div>

            <ul className="grid gap-2">
              {next.exercises.map((exercise) => (
                <li
                  key={exercise.name}
                  className="flex items-center justify-between gap-3 text-sm border-t border-zinc-100 dark:border-zinc-800 pt-2 first:border-t-0 first:pt-0"
                >
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {exercise.name}
                    {exercise.note && (
                      <span className="text-zinc-400 text-xs ml-2">
                        {exercise.note}
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
                    {exercise.weightKg ? `${exercise.weightKg}kg · ` : ""}
                    {exercise.sets}x{exercise.reps}
                  </span>
                </li>
              ))}
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
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {session.dayType}
                  </span>
                  <span className="text-xs text-zinc-400 ml-2">
                    {new Date(session.completedAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                <button
                  onClick={() => handleUndo(session)}
                  className="px-3 py-1.5 text-xs rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  취소
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
