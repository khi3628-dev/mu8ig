// 물 위에서 통통 튀는 연출 (화면 전용, 레이스 결과에는 영향 없음).
// 달리는 동안 파도 리듬에 맞춰 통통 튀며 나간다. 빠를수록 더 자주, 더 높이 튄다.

export const HOP_GRAVITY = 14; // 실제보다 조금 강하게 해서 경쾌하게 떨어지게 한다
const LAUNCH_MIN = 0.9; // 이보다 약한 반동은 수면에 붙어 있는다 (정지·저속에서 잔떨림 방지)
const LAUNCH_MAX = 3.2; // 한 번에 튀는 힘의 상한 (파도 골짜기로 떨어지면 최대 약 0.6m)

export interface Hop {
  y: number; // 선체 높이 (월드 좌표)
  vy: number;
  prevSurf: number | null;
  airborne: boolean;
}

export const createHop = (): Hop => ({ y: 0, vy: 0, prevSurf: null, airborne: false });

// 고속에서 자주 튀도록 큰 파도 위에 얹는 잔물결
export function chop(x: number, z: number, t: number) {
  return 0.07 * Math.sin(x * 0.55 + t * 2.3) * Math.sin(z * 0.47 - t * 1.9);
}

// 한 프레임 진행. 착수하는 순간이면 충격 속도(m/s)를, 아니면 0을 돌려준다.
export function stepHop(h: Hop, surf: number, dt: number, speedFrac: number) {
  if (h.prevSurf === null || dt <= 0) {
    h.prevSurf = surf;
    h.y = surf;
    return 0;
  }
  const surfVel = (surf - h.prevSurf) / dt;
  h.prevSurf = surf;
  if (!h.airborne) {
    // 수면을 타고 가다가, 수면이 솟는 속도에 주행 속도만큼 실린 반동이 충분히 세면 떠오른다
    const rebound = surfVel * (1 + 2 * Math.max(0, speedFrac));
    if (rebound < LAUNCH_MIN) {
      h.y = surf;
      h.vy = 0;
      return 0;
    }
    h.airborne = true;
    h.y = surf;
    h.vy = Math.min(rebound, LAUNCH_MAX);
  }
  h.vy -= HOP_GRAVITY * dt;
  h.y += h.vy * dt;
  if (h.y > surf) return 0;
  const impact = Math.max(0, -h.vy);
  h.y = surf;
  h.vy = 0;
  h.airborne = false;
  return impact;
}
