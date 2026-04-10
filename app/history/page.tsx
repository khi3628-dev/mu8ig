'use client';

import { useWorkouts } from '../hooks/useWorkouts';
import { getExerciseById } from '../lib/exercises';
import Navigation from '../components/Navigation';

export default function HistoryPage() {
  const { workouts, dailyStats, deleteWorkout, isLoaded } = useWorkouts();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">로딩중...</div>
      </div>
    );
  }

  // Max calories for chart scaling
  const maxCalories = Math.max(...dailyStats.map(d => d.totalCalories), 100);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          운동 히스토리
        </h1>

        {/* Weekly Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4">주간 칼로리 소모</h2>
          <div className="flex items-end justify-between gap-1 h-32">
            {dailyStats.map((day) => {
              const height = day.totalCalories > 0
                ? Math.max((day.totalCalories / maxCalories) * 100, 8)
                : 4;
              const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'short' });
              const isToday = day.date === new Date().toISOString().split('T')[0];

              return (
                <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {day.totalCalories > 0 ? day.totalCalories : ''}
                  </span>
                  <div
                    className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${
                      isToday
                        ? 'bg-gradient-to-t from-blue-500 to-blue-400'
                        : day.totalCalories > 0
                        ? 'bg-gradient-to-t from-blue-300 to-blue-200 dark:from-blue-700 dark:to-blue-600'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className={`text-xs ${isToday ? 'font-bold text-blue-500' : 'text-zinc-400'}`}>
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workout List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400">전체 기록</h2>
          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🏋️</div>
              <p className="text-zinc-400">아직 운동 기록이 없습니다</p>
              <p className="text-sm text-zinc-300 dark:text-zinc-600">운동을 시작해보세요!</p>
            </div>
          ) : (
            workouts.map((workout) => {
              const exercise = getExerciseById(workout.exerciseId);
              if (!exercise) return null;

              return (
                <div
                  key={workout.id}
                  className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm flex items-center gap-3"
                >
                  <div className="text-2xl w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 rounded-lg">
                    {exercise.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-900 dark:text-white text-sm">
                      {exercise.nameKo}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {workout.date} · {workout.durationMinutes}분
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-500 text-sm">
                      {workout.caloriesBurned} kcal
                    </p>
                  </div>
                  <button
                    onClick={() => deleteWorkout(workout.id)}
                    className="text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-colors p-1"
                    aria-label="삭제"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
}
