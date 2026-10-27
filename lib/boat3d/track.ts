import { distanceToCourse, type Point } from "@/lib/boat/race";

// 코스 중심선에서 half 만큼 떨어진 경계선 위에 부표를 놓을 좌표를 구한다.
// 선분 양옆과 꼭짓점 둘레에서 후보를 만들고, 다른 구간과 겹치는 안쪽 후보는 버린 뒤 gap 간격으로 솎는다.
export function boundaryPoints(course: Point[], half: number, gap = 14): Point[] {
  const candidates: Point[] = [];
  const n = course.length;
  for (let i = 0; i < n; i++) {
    const a = course[i];
    const b = course[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    for (let s = 0; s < len; s += 6) {
      for (const side of [1, -1]) {
        candidates.push({ x: a.x + (dx / len) * s + nx * half * side, y: a.y + (dy / len) * s + ny * half * side });
      }
    }
    for (let k = 0; k < 24; k++) {
      const ang = (k / 24) * Math.PI * 2;
      candidates.push({ x: a.x + Math.cos(ang) * half, y: a.y + Math.sin(ang) * half });
    }
  }
  const edge = candidates.filter((p) => distanceToCourse(course, p.x, p.y) >= half - 0.5);
  const out: Point[] = [];
  for (const p of edge) {
    if (out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= gap)) out.push(p);
  }
  return out;
}
