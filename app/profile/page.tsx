'use client';

import { useWorkouts } from '../hooks/useWorkouts';
import { AVATAR_LEVELS } from '../lib/types';
import Navigation from '../components/Navigation';

export default function ProfilePage() {
  const { profile, setProfile, totalCalories, totalMinutes, totalWorkouts, isLoaded } = useWorkouts();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">로딩중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          내 프로필
        </h1>

        {/* Profile Settings */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4">기본 정보</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-500 mb-1">이름</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ name: e.target.value })}
                className="w-full h-11 px-4 bg-zinc-100 dark:bg-zinc-700 rounded-xl text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-500 mb-1">체중 (kg)</label>
              <input
                type="number"
                value={profile.weightKg}
                onChange={(e) => setProfile({ weightKg: Number(e.target.value) })}
                className="w-full h-11 px-4 bg-zinc-100 dark:bg-zinc-700 rounded-xl text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-400 mt-1">정확한 칼로리 계산을 위해 입력해주세요</p>
            </div>

            <div>
              <label className="block text-sm text-zinc-500 mb-1">키 (cm)</label>
              <input
                type="number"
                value={profile.heightCm}
                onChange={(e) => setProfile({ heightCm: Number(e.target.value) })}
                className="w-full h-11 px-4 bg-zinc-100 dark:bg-zinc-700 rounded-xl text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Total Stats */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4">누적 통계</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-orange-500">{totalCalories.toLocaleString()}</p>
              <p className="text-xs text-zinc-400">총 칼로리</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-500">{totalMinutes.toLocaleString()}</p>
              <p className="text-xs text-zinc-400">총 시간(분)</p>
            </div>
            <div>
              <p className="text-2xl font-black text-green-500">{totalWorkouts}</p>
              <p className="text-xs text-zinc-400">총 운동횟수</p>
            </div>
          </div>
        </div>

        {/* Avatar Level Info */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4">아바타 레벨 시스템</h2>
          <div className="space-y-3">
            {AVATAR_LEVELS.map((lv) => {
              const isAchieved = totalCalories >= lv.minCalories;
              return (
                <div
                  key={lv.level}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isAchieved
                      ? 'bg-zinc-50 dark:bg-zinc-700'
                      : 'opacity-40'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: lv.color }}
                  >
                    {lv.level}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-zinc-900 dark:text-white">
                      {lv.name} ({lv.nameEn})
                    </p>
                    <p className="text-xs text-zinc-400">
                      {lv.minCalories.toLocaleString()} kcal 이상
                    </p>
                  </div>
                  {isAchieved && (
                    <span className="text-green-500 text-sm">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  );
}
