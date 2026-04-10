'use client';

import { useState, useEffect, useCallback } from 'react';
import { WorkoutLog, UserProfile, DailyStats } from '../lib/types';

const WORKOUTS_KEY = 'fitavatar_workouts';
const PROFILE_KEY = 'fitavatar_profile';

const DEFAULT_PROFILE: UserProfile = {
  weightKg: 70,
  heightCm: 175,
  name: '사용자',
};

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WORKOUTS_KEY);
      if (saved) setWorkouts(JSON.parse(saved));

      const savedProfile = localStorage.getItem(PROFILE_KEY);
      if (savedProfile) setProfileState(JSON.parse(savedProfile));
    } catch {
      // Ignore parse errors
    }
    setIsLoaded(true);
  }, []);

  // Save workouts to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
    }
  }, [workouts, isLoaded]);

  // Save profile to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
  }, [profile, isLoaded]);

  const addWorkout = useCallback((workout: Omit<WorkoutLog, 'id' | 'timestamp'>) => {
    const newWorkout: WorkoutLog = {
      ...workout,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setWorkouts(prev => [newWorkout, ...prev]);
    return newWorkout;
  }, []);

  const deleteWorkout = useCallback((id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
  }, []);

  const setProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfileState(prev => ({ ...prev, ...updates }));
  }, []);

  // Computed values
  const totalCalories = workouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
  const totalMinutes = workouts.reduce((sum, w) => sum + w.durationMinutes, 0);
  const totalWorkouts = workouts.length;

  // Today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayWorkouts = workouts.filter(w => w.date === today);
  const todayCalories = todayWorkouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
  const todayMinutes = todayWorkouts.reduce((sum, w) => sum + w.durationMinutes, 0);

  // Weekly stats (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  const weekWorkouts = workouts.filter(w => w.date >= weekAgoStr);
  const weekCalories = weekWorkouts.reduce((sum, w) => sum + w.caloriesBurned, 0);

  // Daily stats for chart (last 7 days)
  const dailyStats: DailyStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayWorkouts = workouts.filter(w => w.date === dateStr);
    dailyStats.push({
      date: dateStr,
      totalCalories: dayWorkouts.reduce((sum, w) => sum + w.caloriesBurned, 0),
      totalMinutes: dayWorkouts.reduce((sum, w) => sum + w.durationMinutes, 0),
      workoutCount: dayWorkouts.length,
    });
  }

  return {
    workouts,
    profile,
    isLoaded,
    addWorkout,
    deleteWorkout,
    setProfile,
    totalCalories,
    totalMinutes,
    totalWorkouts,
    todayCalories,
    todayMinutes,
    todayWorkouts,
    weekCalories,
    weekWorkouts,
    dailyStats,
  };
}
