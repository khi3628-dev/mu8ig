'use client';

import Avatar, { getAvatarLevel } from './components/Avatar';
import Navigation from './components/Navigation';
import { useWorkouts } from './hooks/useWorkouts';
import { getExerciseById } from './lib/exercises';
import Link from 'next/link';

export default function Home() {
  const {
    isLoaded,
    profile,
    totalCalories,
    totalMinutes,
    totalWorkouts,
    todayCalories,
    todayMinutes,
    todayWorkouts,
    weekCalories,
    dailyStats,
  } = useWorkouts();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-pulse text-zinc-400 text-lg">FitAvatar</div>
      </div>
    );
  }

  const level = getAvatarLevel(totalCalories);
  const maxDaily = Math.max(...dailyStats.map(d => d.totalCalories), 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-zinc-400">안녕하세요</p>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              {profile.name}님 💪
            </h1>
          </div>
          <Link
            href="/profile"
            className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm"
          >
            👤
          </Link>
        </div>

        {/* Avatar Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-3xl p-6 shadow-lg mb-6 overflow-hidden relative">
          {/* Decorative background circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 opacity-50" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 opacity-50" />

          <div className="relative z-10">
            <Avatar level={level} totalCalories={totalCalories} />
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-orange-500">{todayCalories}</p>
            <p className="text-[10px] text-zinc-400 mt-1">오늘 칼로리</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-blue-500">{todayMinutes}</p>
            <p className="text-[10px] text-zinc-400 mt-1">오늘 시간(분)</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-black text-green-500">{todayWorkouts.length}</p>
            <p className="text-[10px] text-zinc-400 mt-1">오늘 운동</p>
          </div>
        </div>

        {/* Weekly Mini Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">이번 주</h2>
            <span className="text-sm font-bold text-blue-500">{weekCalories.toLocaleString()} kcal</span>
          </div>
          <div className="flex items-end justify-between gap-1 h-16">
            {dailyStats.map((day) => {
              const height = day.totalCalories > 0
                ? Math.max((day.totalCalories / maxDaily) * 100, 8)
                : 4;
              const isToday = day.date === new Date().toISOString().split('T')[0];
              const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'narrow' });

              return (
                <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full max-w-[24px] rounded-t-md transition-all duration-500 ${
                      isToday
                        ? 'bg-blue-500'
                        : day.totalCalories > 0
                        ? 'bg-blue-200 dark:bg-blue-800'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className={`text-[9px] ${isToday ? 'font-bold text-blue-500' : 'text-zinc-400'}`}>
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Workouts */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">최근 운동</h2>
            <Link href="/history" className="text-xs text-blue-500">
              전체보기
            </Link>
          </div>
          {todayWorkouts.length === 0 ? (
            <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 text-center shadow-sm">
              <p className="text-zinc-400 text-sm mb-3">오늘 아직 운동 기록이 없어요</p>
              <Link
                href="/log"
                className="inline-block px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium text-sm active:scale-95 transition-transform"
              >
                운동 기록하기
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todayWorkouts.slice(0, 3).map((w) => {
                const exercise = getExerciseById(w.exerciseId);
                if (!exercise) return null;
                return (
                  <div
                    key={w.id}
                    className="bg-white dark:bg-zinc-800 rounded-xl p-3 shadow-sm flex items-center gap-3"
                  >
                    <span className="text-xl">{exercise.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{exercise.nameKo}</p>
                      <p className="text-xs text-zinc-400">{w.durationMinutes}분</p>
                    </div>
                    <p className="font-bold text-sm text-orange-500">{w.caloriesBurned} kcal</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Total Stats */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-5 shadow-lg text-white">
          <h2 className="text-sm font-medium opacity-80 mb-3">전체 누적 기록</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-black">{totalCalories.toLocaleString()}</p>
              <p className="text-[10px] opacity-70">칼로리</p>
            </div>
            <div>
              <p className="text-xl font-black">{totalMinutes.toLocaleString()}</p>
              <p className="text-[10px] opacity-70">분</p>
            </div>
            <div>
              <p className="text-xl font-black">{totalWorkouts}</p>
              <p className="text-[10px] opacity-70">운동 횟수</p>
            </div>
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  );
}
