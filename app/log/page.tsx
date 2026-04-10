'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EXERCISES, CATEGORIES } from '../lib/exercises';
import { calculateCalories } from '../lib/calories';
import { caloriesToFood } from '../lib/calories';
import { useWorkouts } from '../hooks/useWorkouts';
import Navigation from '../components/Navigation';

export default function LogPage() {
  const router = useRouter();
  const { addWorkout, profile } = useWorkouts();
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [showResult, setShowResult] = useState(false);
  const [lastCalories, setLastCalories] = useState(0);

  const categories = ['전체', ...CATEGORIES];
  const filteredExercises = selectedCategory === '전체'
    ? EXERCISES
    : EXERCISES.filter(e => e.category === selectedCategory);

  const exercise = EXERCISES.find(e => e.id === selectedExercise);
  const estimatedCalories = exercise
    ? calculateCalories(exercise.met, profile.weightKg, duration)
    : 0;

  function handleLog() {
    if (!exercise) return;

    const calories = calculateCalories(exercise.met, profile.weightKg, duration);
    addWorkout({
      exerciseId: exercise.id,
      durationMinutes: duration,
      caloriesBurned: calories,
      date: new Date().toISOString().split('T')[0],
    });
    setLastCalories(calories);
    setShowResult(true);
  }

  if (showResult) {
    const foodEquivs = caloriesToFood(lastCalories);
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-zinc-900 dark:to-zinc-950 pb-24">
        <div className="max-w-lg mx-auto px-4 pt-12">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              운동 완료!
            </h1>
            <div className="text-5xl font-black text-green-500 mb-1">
              {lastCalories.toLocaleString()}
            </div>
            <p className="text-zinc-500">kcal 소모</p>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-lg mb-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">이만큼 먹을 수 있어요!</h3>
            <div className="space-y-3">
              {foodEquivs.map((food) => (
                <div key={food.name} className="flex justify-between items-center">
                  <span className="text-sm">{food.name}</span>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{food.count}개</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowResult(false);
                setSelectedExercise(null);
              }}
              className="flex-1 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 active:scale-95 transition-transform"
            >
              추가 기록
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 h-12 bg-green-500 rounded-xl font-bold text-white active:scale-95 transition-transform"
            >
              홈으로
            </button>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          운동 기록하기
        </h1>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Exercise Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {filteredExercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedExercise(ex.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all active:scale-95 ${
                selectedExercise === ex.id
                  ? 'bg-blue-500 text-white shadow-lg scale-105'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span className="text-2xl">{ex.icon}</span>
              <span className="text-xs font-medium">{ex.nameKo}</span>
              <span className="text-[10px] opacity-60">{ex.met} MET</span>
            </button>
          ))}
        </div>

        {/* Duration & Calorie Calculator */}
        {exercise && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-lg mb-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{exercise.icon}</span>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  {exercise.nameKo}
                </h3>
                <p className="text-xs text-zinc-400">MET {exercise.met} | {exercise.category}</p>
              </div>
            </div>

            {/* Duration Slider */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-500">운동 시간</span>
                <span className="text-lg font-bold text-blue-500">{duration}분</span>
              </div>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none accent-blue-500"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-1">
                <span>5분</span>
                <span>180분</span>
              </div>
            </div>

            {/* Quick Duration Buttons */}
            <div className="flex gap-2 mb-5">
              {[15, 30, 45, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    duration === d
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {d}분
                </button>
              ))}
            </div>

            {/* Calorie Preview */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-zinc-500 mb-1">예상 칼로리 소모량</p>
                <p className="text-4xl font-black text-orange-500">
                  {estimatedCalories.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-400">kcal</p>
              </div>
              <div className="mt-3 text-center">
                <p className="text-[10px] text-zinc-400">
                  계산: {exercise.met} MET x {profile.weightKg}kg x {duration}분 / 60
                </p>
              </div>
            </div>

            {/* Log Button */}
            <button
              onClick={handleLog}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-bold text-white text-lg shadow-lg active:scale-95 transition-transform"
            >
              기록 완료!
            </button>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
}
