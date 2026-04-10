import { Exercise } from './types';

export const EXERCISES: Exercise[] = [
  // 유산소
  { id: 'walking', name: 'Walking', nameKo: '걷기', category: '유산소', met: 4.3, icon: '🚶' },
  { id: 'running', name: 'Running', nameKo: '달리기', category: '유산소', met: 9.8, icon: '🏃' },
  { id: 'cycling', name: 'Cycling', nameKo: '자전거', category: '유산소', met: 8.0, icon: '🚴' },
  { id: 'swimming', name: 'Swimming', nameKo: '수영', category: '유산소', met: 7.0, icon: '🏊' },
  { id: 'jump-rope', name: 'Jump Rope', nameKo: '줄넘기', category: '유산소', met: 12.3, icon: '⏫' },
  { id: 'dancing', name: 'Dancing', nameKo: '댄스', category: '유산소', met: 7.8, icon: '💃' },
  { id: 'hiking', name: 'Hiking', nameKo: '등산', category: '유산소', met: 6.5, icon: '⛰️' },
  { id: 'rowing', name: 'Rowing', nameKo: '조정', category: '유산소', met: 7.0, icon: '🚣' },

  // 근력
  { id: 'weight-training', name: 'Weight Training', nameKo: '웨이트', category: '근력', met: 6.0, icon: '🏋️' },
  { id: 'pushups', name: 'Push-ups', nameKo: '푸쉬업', category: '근력', met: 8.0, icon: '💪' },
  { id: 'squats', name: 'Squats', nameKo: '스쿼트', category: '근력', met: 5.0, icon: '🦵' },
  { id: 'pullups', name: 'Pull-ups', nameKo: '풀업', category: '근력', met: 8.0, icon: '🤸' },
  { id: 'deadlift', name: 'Deadlift', nameKo: '데드리프트', category: '근력', met: 6.0, icon: '🏗️' },
  { id: 'bench-press', name: 'Bench Press', nameKo: '벤치프레스', category: '근력', met: 6.0, icon: '🛏️' },

  // 고강도
  { id: 'hiit', name: 'HIIT', nameKo: 'HIIT', category: '고강도', met: 8.0, icon: '🔥' },
  { id: 'crossfit', name: 'CrossFit', nameKo: '크로스핏', category: '고강도', met: 10.0, icon: '⚡' },
  { id: 'boxing', name: 'Boxing', nameKo: '복싱', category: '고강도', met: 7.8, icon: '🥊' },
  { id: 'kickboxing', name: 'Kickboxing', nameKo: '킥복싱', category: '고강도', met: 10.3, icon: '🦶' },

  // 유연성
  { id: 'yoga', name: 'Yoga', nameKo: '요가', category: '유연성', met: 3.0, icon: '🧘' },
  { id: 'pilates', name: 'Pilates', nameKo: '필라테스', category: '유연성', met: 3.8, icon: '🤾' },
  { id: 'stretching', name: 'Stretching', nameKo: '스트레칭', category: '유연성', met: 2.3, icon: '🙆' },
];

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find(e => e.id === id);
}

export function getExercisesByCategory(category: string): Exercise[] {
  return EXERCISES.filter(e => e.category === category);
}

export const CATEGORIES = ['유산소', '근력', '고강도', '유연성'] as const;
