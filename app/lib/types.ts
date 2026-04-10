export interface Exercise {
  id: string;
  name: string;
  nameKo: string;
  category: ExerciseCategory;
  met: number; // Metabolic Equivalent of Task
  icon: string;
}

export type ExerciseCategory = '유산소' | '근력' | '유연성' | '고강도';

export interface WorkoutLog {
  id: string;
  exerciseId: string;
  durationMinutes: number;
  caloriesBurned: number;
  date: string; // ISO date string
  timestamp: number;
}

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  name: string;
}

export interface DailyStats {
  date: string;
  totalCalories: number;
  totalMinutes: number;
  workoutCount: number;
}

// Avatar levels based on cumulative calories burned
export const AVATAR_LEVELS = [
  { level: 1, name: '입문자', nameEn: 'Beginner', minCalories: 0, color: '#94a3b8' },
  { level: 2, name: '도전자', nameEn: 'Challenger', minCalories: 500, color: '#60a5fa' },
  { level: 3, name: '파이터', nameEn: 'Fighter', minCalories: 2000, color: '#34d399' },
  { level: 4, name: '전사', nameEn: 'Warrior', minCalories: 5000, color: '#f59e0b' },
  { level: 5, name: '챔피언', nameEn: 'Champion', minCalories: 15000, color: '#ef4444' },
] as const;

export type AvatarLevel = 1 | 2 | 3 | 4 | 5;
