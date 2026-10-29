// 웹 버전(TypeScript) 레이스를 고정 입력으로 끝까지 돌려 기준값을 만든다.
// C++ 코어 테스트(CoreTests.cpp)가 같은 입력으로 돌린 결과와 비교해 이식이 같은지 확인한다.
// 실행: npx tsx unreal/YachtParadise/Tests/parity/generate.ts > unreal/YachtParadise/Tests/parity/expected.txt
import { createRace, fishCoins, raceResult, updateRace } from "../../../../lib/boat/race";

// 두 언어에서 똑같이 나오는 작은 선형 합동 난수
function lcg(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const fmt = (v: number) => v.toFixed(6);

for (const scenario of [1, 2]) {
  const rand = lcg(scenario * 17);
  const stats = scenario === 1 ? { topSpeed: 31.5, turnRate: 2.42, catchRadius: 11 } : { topSpeed: 30, turnRate: 2.2, catchRadius: 9 };
  const perks = scenario === 1 ? { prize: 0.13, fish: 0.17, startSpeed: 5, boost: 0.3 } : { prize: 0, fish: 0, startSpeed: 0, boost: 0 };
  const s = createRace(rand, stats, perks);
  const dt = 1 / 60;
  for (let i = 0; i < 12000 && !s.done; i++) {
    const p = s.racers[0];
    const cp = s.course[p.next];
    let d = Math.atan2(cp.y - p.y, cp.x - p.x) - p.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    // 시나리오 2는 흔들리며 달리고, 중간에 잠깐 후진도 한다
    const wobble = scenario === 2 ? Math.sin(i * 0.02) * 0.6 : 0;
    const reverse = scenario === 2 && i >= 400 && i < 460;
    updateRace(s, dt, {
      throttle: 1,
      steer: Math.max(-1, Math.min(1, (d + wobble) * 3)),
      fish: i % 90 === 0,
      reverse,
    }, rand);
    if (i % 600 === 0) {
      const r0 = s.racers[0];
      console.log(
        `S${scenario} step=${i} t=${fmt(s.time)} p=${fmt(r0.x)},${fmt(r0.y)} v=${fmt(r0.speed)} lap=${r0.lap} next=${r0.next}` +
          ` ai1=${fmt(s.racers[1].x)},${fmt(s.racers[1].y)} contacts=${s.contacts} caught=${s.caught.length} coins=${fishCoins(s)}` +
          ` rec=${s.recording.points.length} msg=${s.message}`,
      );
    }
  }
  const r = raceResult(s);
  console.log(
    `S${scenario} result rank=${r.rank} finished=${r.finished} time=${fmt(r.time)} prize=${r.prize} coins=${r.fishCoins}` +
      ` caught=${r.caught.length} splits=${r.run?.splits.length ?? 0} order=${r.standings.map((x) => x.name).join("/")}`,
  );
}
