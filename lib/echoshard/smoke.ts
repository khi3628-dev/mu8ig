// 개발용 배치 측정: node <bundle> [경기수] [--ab]
//   --ab 를 주면 세계 접힘 켬/끔을 같은 시드 집합으로 비교한다.
import { runBatch, verdict, type BatchSummary } from './headless';

const args = process.argv.slice(2);
const count = Number(args.find((a) => !a.startsWith('--')) ?? 5);
const ab = args.includes('--ab');

const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function report(title: string, s: BatchSummary): void {
  console.log(`\n=== ${title} (${s.count}경기) ===`);
  console.log(`경기 길이  P50 ${mm(s.p50)}  P90 ${mm(s.p90)}  최소 ${mm(s.min)}  최대 ${mm(s.max)}`);
  console.log(`청 승률 ${(s.blueWinRate * 100).toFixed(1)}%   13~15분 적중 ${(s.inTargetWindow * 100).toFixed(1)}%`);
  console.log(`8분 골드차 평균 ${Math.round(s.meanGoldGapAt8)}   역전률 ${(s.comebackRate * 100).toFixed(1)}%`);
  console.log(`접힘 구역 교전  직전 60초 ${s.fightsBeforeFold} → 직후 60초 ${s.fightsAfterFold}`);
}

const started = Date.now();

if (ab) {
  const on = runBatch(count, { seed: 1, foldEnabled: true });
  const off = runBatch(count, { seed: 1, foldEnabled: false });
  report('접힘 켬', on);
  report('접힘 끔', off);
  console.log('\n--- 접힘의 효과 ---');
  console.log(`경기 길이 P50 차이  ${mm(on.p50)} vs ${mm(off.p50)}  (${Math.round(on.p50 - off.p50)}초)`);
  console.log(`역전률             ${(on.comebackRate * 100).toFixed(1)}% vs ${(off.comebackRate * 100).toFixed(1)}%`);
  console.log(`접힘 구역 교전     ${on.fightsAfterFold} vs ${off.fightsAfterFold}`);
  console.log('');
  for (const v of verdict(on)) console.log(`${v.pass ? '통과' : '미달'}  ${v.line}`);
} else {
  const s = runBatch(count, { seed: 1 });
  report('봇 대 봇', s);
  console.log('');
  for (const v of verdict(s)) console.log(`${v.pass ? '통과' : '미달'}  ${v.line}`);
}

console.log(`\n소요 ${((Date.now() - started) / 1000).toFixed(1)}초`);
