/**
 * MET (Metabolic Equivalent of Task) 기반 칼로리 계산
 *
 * 공식: 칼로리 = MET × 체중(kg) × 시간(hour)
 *
 * MET 값은 안정 시 대사율의 배수를 나타냄
 * - 1 MET = 안정 시 에너지 소비 (약 1 kcal/kg/hour)
 * - 8 MET = 안정 시의 8배 에너지 소비
 */

export function calculateCalories(
  met: number,
  weightKg: number,
  durationMinutes: number
): number {
  const durationHours = durationMinutes / 60;
  const calories = met * weightKg * durationHours;
  return Math.round(calories);
}

/**
 * 일일 기초 대사량 (BMR) 계산 - Harris-Benedict 공식
 */
export function calculateBMR(weightKg: number, heightCm: number, age: number = 30): number {
  // 남성 기준 (간소화)
  return Math.round(88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age));
}

/**
 * 칼로리를 음식 등가물로 변환 (재미 요소)
 */
export function caloriesToFood(calories: number): { name: string; count: string }[] {
  return [
    { name: '🍚 밥 한 공기', count: (calories / 300).toFixed(1) },
    { name: '🍕 피자 한 조각', count: (calories / 270).toFixed(1) },
    { name: '🍦 아이스크림', count: (calories / 250).toFixed(1) },
    { name: '🍺 맥주 한 잔', count: (calories / 150).toFixed(1) },
    { name: '🍫 초콜릿 바', count: (calories / 230).toFixed(1) },
  ];
}
