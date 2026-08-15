/**
 * DUP(Daily Undulating Periodization) 근비대 프로그램.
 *
 * 같은 종목을 주 3회, 세 가지 강도(금비대→파워→스트랭스 순)로 순환시킨다.
 * 이 순서가 파워를 먼저 넣는 것보다 근력 향상이 빠르다는 연구 결과를 반영했다.
 * 스쿼트+랫풀다운(A)과 벤치프레스+데드리프트(B) 두 축을 번갈아 돌려
 * 같은 종목이 주 3회, 전체 세션은 6개(A1~A3, B1~B3) 순환하도록 구성했다.
 */

export type DayType = "A1" | "A2" | "A3" | "B1" | "B2" | "B3";

export const ROTATION: DayType[] = ["A1", "B1", "A2", "B2", "A3", "B3"];

/** 1RM (kg). 무게 계산의 기준값. */
export const ONE_RM_KG = {
  squat: 130,
  latPulldown: 100,
  deadlift: 160,
  bench: 100,
} as const;

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weightKg?: number;
  note?: string;
}

export interface DaySpec {
  dayType: DayType;
  label: string;
  focus: "금비대" | "파워" | "스트랭스";
  exercises: Exercise[];
}

/** 5kg 단위로 반올림 (원판 조합이 쉬운 값으로). */
function pct(oneRm: number, ratio: number): number {
  return Math.round((oneRm * ratio) / 2.5) * 2.5;
}

export const PROGRAM: Record<DayType, DaySpec> = {
  A1: {
    dayType: "A1",
    label: "스쿼트 + 랫풀다운 · 금비대",
    focus: "금비대",
    exercises: [
      { name: "스쿼트", sets: 5, reps: "8", weightKg: pct(ONE_RM_KG.squat, 0.75) },
      { name: "랫풀다운", sets: 5, reps: "8~10", weightKg: pct(ONE_RM_KG.latPulldown, 0.75) },
      { name: "레그프레스", sets: 3, reps: "10~12" },
      { name: "루마니안 데드리프트", sets: 3, reps: "10", note: "경량 보조" },
      { name: "시티드 케이블로우", sets: 3, reps: "10~12" },
      { name: "페이스풀", sets: 3, reps: "15" },
      { name: "카프레이즈", sets: 3, reps: "15" },
    ],
  },
  A2: {
    dayType: "A2",
    label: "스쿼트 + 랫풀다운 · 파워",
    focus: "파워",
    exercises: [
      { name: "스쿼트", sets: 5, reps: "3", weightKg: pct(ONE_RM_KG.squat, 0.7), note: "최대한 폭발적으로" },
      { name: "랫풀다운", sets: 5, reps: "5", weightKg: pct(ONE_RM_KG.latPulldown, 0.7), note: "빠른 컨센트릭" },
      { name: "박스점프 / 점프스쿼트", sets: 3, reps: "5" },
      { name: "레그프레스", sets: 3, reps: "8" },
      { name: "벤트오버 로우", sets: 3, reps: "8" },
    ],
  },
  A3: {
    dayType: "A3",
    label: "스쿼트 + 랫풀다운 · 스트랭스",
    focus: "스트랭스",
    exercises: [
      { name: "스쿼트", sets: 5, reps: "5", weightKg: pct(ONE_RM_KG.squat, 0.85) },
      { name: "랫풀다운", sets: 5, reps: "5", weightKg: pct(ONE_RM_KG.latPulldown, 0.85) },
      { name: "레그프레스", sets: 3, reps: "6", note: "고중량" },
      { name: "바벨로우", sets: 3, reps: "6" },
      { name: "행잉 레그레이즈", sets: 3, reps: "10" },
    ],
  },
  B1: {
    dayType: "B1",
    label: "벤치프레스 + 데드리프트 · 금비대",
    focus: "금비대",
    exercises: [
      { name: "벤치프레스", sets: 5, reps: "8", weightKg: pct(ONE_RM_KG.bench, 0.75) },
      {
        name: "데드리프트",
        sets: 3,
        reps: "8",
        weightKg: pct(ONE_RM_KG.deadlift, 0.75),
        note: "전신 피로도 고려해 세트 축소",
      },
      { name: "인클라인 덤벨프레스", sets: 3, reps: "10~12" },
      { name: "케이블 플라이 / 딥스", sets: 3, reps: "12" },
      { name: "페이스풀", sets: 3, reps: "15" },
      { name: "행잉 레그레이즈", sets: 3, reps: "12" },
    ],
  },
  B2: {
    dayType: "B2",
    label: "벤치프레스 + 데드리프트 · 파워",
    focus: "파워",
    exercises: [
      { name: "벤치프레스", sets: 5, reps: "3", weightKg: pct(ONE_RM_KG.bench, 0.7), note: "스피드 벤치" },
      { name: "데드리프트", sets: 3, reps: "3", weightKg: pct(ONE_RM_KG.deadlift, 0.7), note: "폭발적으로 당기기" },
      { name: "인클라인 프레스", sets: 3, reps: "8" },
      { name: "로우류", sets: 3, reps: "8" },
    ],
  },
  B3: {
    dayType: "B3",
    label: "벤치프레스 + 데드리프트 · 스트랭스",
    focus: "스트랭스",
    exercises: [
      { name: "벤치프레스", sets: 5, reps: "5", weightKg: pct(ONE_RM_KG.bench, 0.85) },
      { name: "데드리프트", sets: 3, reps: "5", weightKg: pct(ONE_RM_KG.deadlift, 0.85) },
      { name: "클로즈그립 벤치 / 딥스", sets: 3, reps: "6~8" },
      { name: "바벨로우", sets: 3, reps: "6" },
    ],
  },
};

export function isDayType(value: string): value is DayType {
  return value in PROGRAM;
}

/** completedCount번째까지 완료했다면 그다음(=completedCount번째, 0-indexed) 세션 타입. */
export function nextDayType(completedCount: number): DayType {
  return ROTATION[completedCount % ROTATION.length];
}
