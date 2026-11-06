// 화면 문구 한국어/영어. 규칙 코어(race·paradise·meta)는 한국어 원문을 그대로 두고,
// 화면 계층이 여기서 바꿔 보여 준다 — 포털(해외 사용자) 출시용. 브라우저 언어가 ko면 한국어.
import type { RacePerks } from "./race";
import type { ItemId, UpgradeId } from "./paradise";
import type { MissionKind } from "./meta";

export type Locale = "ko" | "en";

export function getLocale(): Locale {
  if (typeof navigator === "undefined") return "ko";
  return navigator.language?.toLowerCase().startsWith("ko") ? "ko" : "en";
}

// ── 공통 사전 (키는 영어 원문 요약) ──
const T = {
  gameTitle: ["요트 파라다이스 레이싱", "Yacht Paradise Racing"],
  tagline: [
    "3분 레이스로 순위를 가리고, 낚시와 상금으로 나만의 요트 섬을 만든다.",
    "Race for 3 minutes, then spend prize money and fish coins building your own yacht island.",
  ],
  start: ["START · 게임 시작", "START"],
  privacy: ["개인정보처리방침", "Privacy Policy"],
  race: ["RACE · 레이스 출전", "RACE"],
  continueToParadise: ["CONTINUE · 파라다이스로", "CONTINUE"],
  timeOverHalf: ["TIME OVER · 상금 50%", "TIME OVER · 50% PRIZE"],
  watchAdDouble: ["광고 보고 상금 2배", "WATCH AD · DOUBLE REWARD"],
  adApplied: ["광고 보상 2배 적용", "Ad bonus ×2 applied"],
  missionDone: ["미션 달성", "Mission complete"],
  claimInParadise: ["파라다이스에서 보상 받기", "claim it in Paradise"],
  firstRecord: ["FIRST RECORD · 다음 레이스부터 이 기록과 함께 달린다", "FIRST RECORD · your ghost will race with you next time"],
  // 파라다이스
  myParadise: ["My Yacht Paradise", "My Yacht Paradise"],
  luxury: ["럭셔리", "Luxury"],
  nextLevel: ["다음 단계", "next"],
  until: ["까지", "to go"],
  raceBonusTitle: ["RACE BONUS · 내 섬의 레이스 효과", "RACE BONUS · from your island"],
  raceBonusFoot: ["시설을 지으면 다음 레이스부터 유리해진다", "Build facilities to boost your next race"],
  perkPrize: ["순위 상금", "Prize money"],
  perkFish: ["낚시 코인", "Fish coins"],
  perkStart: ["출발 대시", "Start dash"],
  perkBoost: ["파도 부스트", "Boost pads"],
  garage: ["GARAGE · 정비소", "GARAGE"],
  build: ["BUILD · 선택 후 칸 클릭", "BUILD · pick, then tap a tile"],
  reclaim: ["섬 확장", "Expand island"],
  reclaimSub: ["섬에 붙은 바다를 메움", "Fill sea next to your sand"],
  sell: ["팔기", "Sell"],
  sellSub: ["건설비의 50% 환급", "Refund 50% of cost"],
  onSand: ["섬", "Sand"],
  onWater: ["바다", "Water"],
  needsDock: ["부두 옆", "Needs dock"],
  sand: ["모래섬", "Sand"],
  sea: ["바다", "Water"],
  myAvatar: ["내 캐릭터", "My character"],
  // 레이스 HUD
  remaining: ["남은 시간", "TIME LEFT"],
  lap: ["랩", "LAP"],
  rankSuffix: ["위", ""],
  keysDesktop3P: ["가속", "gas"],
  catchNow: ["SPACE · 낚아채기", "SPACE · CATCH!"],
  hudGas: ["가속", "GAS"],
  hudBrake: ["감속", "BRAKE"],
  hudBrakeFP: ["브레이크", "BRAKE"],
  hudSteer: ["조향", "STEER"],
  hudTurn: ["회전", "TURN"],
  hudGear: ["기어", "GEAR"],
  hudFish: ["낚시", "FISH"],
  hudSound: ["소리", "SOUND"],
  hudFP: ["1인칭", "FIRST-PERSON"],
  hudTP: ["3인칭", "THIRD-PERSON"],
  autoFish: ["낚시 자동", "auto-fishing"],
  ghostName: ["베스트", "BEST"],
  // 튜토리얼
  howTo: ["HOW TO RACE", "HOW TO RACE"],
  tut1: ["가속 ·", "gas ·"],
  tut2: ["감속 ·", "brake ·"],
  tut3: ["조향", "steer"],
  tutLine2: [
    "노란 게이트를 순서대로 지나 3바퀴. 뛰어오르는 물고기 근처에서 SPACE로 낚시",
    "Pass the yellow gates in order, 3 laps. Press SPACE near jumping fish to catch them",
  ],
  tutLine3: ["모바일은 화면 버튼 · 3D는 V키로 1인칭", "On mobile use the buttons · press V for first-person"],
  // 오류 화면
  errTitle: ["화면을 불러오지 못했어요", "Couldn't load the game"],
  err3D: [
    "이 기기나 브라우저에서 3D 그래픽(WebGL)을 쓸 수 없을 수 있어요. 2D 버전은 같은 진행 상황으로 바로 이어서 할 수 있어요.",
    "Your device or browser may not support WebGL. The 2D version continues with the same save.",
  ],
  err2D: ["잠시 후 다시 시도해 주세요. 진행 상황은 저장되어 있어요.", "Please try again. Your progress is saved."],
  retry: ["다시 시도", "Retry"],
  play2D: ["2D로 하기", "Play 2D"],
  // 메타 패널
  todayMissions: ["오늘의 미션 · 자정에 새로 바뀜", "Daily missions · reset at midnight"],
  done: ["완료", "Done"],
  equipped: ["장착 중", "Equipped"],
  equip: ["장착", "Equip"],
  supporterOnly: ["서포터 전용", "Supporter only"],
  music: ["배경음악", "Music"],
  sfx: ["효과음", "Sound FX"],
  supporterDesc: ["전용 스킨 2종(플래티넘·로열 퍼플) + 레이스 사이 광고 제거", "2 exclusive skins + removes between-race ads"],
  supporterThanks: ["적용됨 · 응원해 주셔서 감사합니다", "Active · thank you for the support!"],
  buySupporter: ["서포터 팩 구매", "Buy Supporter Pack"],
  paying: ["결제 중…", "Processing…"],
  boughtSkin: ["스킨을 샀어요. 다음 레이스부터 적용", "Skin purchased — applied from the next race"],
  missionReward: ["미션 보상", "Mission reward"],
  // 접속 보상
  dailyAria: ["매일 접속 보상", "Daily bonus"],
  dailyGrow: ["매일 들어오면 보상이 커져요. 7일째 2,500 CR", "Come back daily for bigger rewards — 2,500 CR on day 7"],
  watchAdX2: ["광고 보고 2배 받기", "Watch ad · claim ×2"],
  claim: ["받기", "Claim"],
} satisfies Record<string, [string, string]>;

export type TKey = keyof typeof T;
export const t = (l: Locale, k: TKey) => T[k][l === "ko" ? 0 : 1];

// ── 코어 데이터의 영어 이름 (코어는 한국어 원문 유지) ──
export const FISH_EN = ["Sardine", "Mackerel", "Tuna", "Golden Marlin"];
const AI_EN: Record<string, string> = { 마르코: "Marco", 소피아: "Sofia", 레오: "Leo", 아이라: "Aira", 카이: "Kai" };
const SKIN_EN: Record<string, string> = {
  classic: "White Gold", ocean: "Ocean Blue", sunset: "Sunset Coral", carbon: "Carbon Black",
  emerald: "Emerald", platinum: "Platinum", royal: "Royal Purple",
};
const ITEM_EN: Record<ItemId, string> = {
  palm: "Palm Tree", sunbed: "Sun Lounger", bar: "Beach Bar", pool: "Infinity Pool", villa: "White Villa",
  lighthouse: "Lighthouse", dock: "Dock", yacht: "Yacht", superyacht: "Superyacht",
};
const UPGRADE_EN: Record<UpgradeId, { name: string; desc: string }> = {
  engine: { name: "Engine", desc: "Top speed +1.5" },
  handling: { name: "Handling", desc: "Turning +10%" },
  net: { name: "Fishing Net", desc: "Catch range +2m" },
};
const LEVEL_EN = ["Deserted Isle", "Little Beach", "Private Beach", "Luxury Marina", "Yacht Paradise"];
const MISSION_EN: Record<MissionKind, string> = {
  races: "Finish 3 races",
  fish: "Catch 6 fish",
  podium: "Finish top-3 twice",
  win: "Win a race",
  record: "Beat your best time",
  marlin: "Catch a Golden Marlin",
};

export const fishName = (l: Locale, ko: string, species: number) => (l === "ko" ? ko : FISH_EN[species] ?? ko);
export const racerName = (l: Locale, ko: string) => (l === "ko" ? ko : AI_EN[ko] ?? ko);
export const skinName = (l: Locale, id: string, ko: string) => (l === "ko" ? ko : SKIN_EN[id] ?? ko);
export const itemName = (l: Locale, id: ItemId, ko: string) => (l === "ko" ? ko : ITEM_EN[id]);
export const upgradeName = (l: Locale, id: UpgradeId, ko: string) => (l === "ko" ? ko : UPGRADE_EN[id].name);
export const upgradeDesc = (l: Locale, id: UpgradeId, ko: string) => (l === "ko" ? ko : UPGRADE_EN[id].desc);
export const levelTitle = (l: Locale, idx: number, ko: string) => (l === "ko" ? ko : LEVEL_EN[idx] ?? ko);
export const missionText = (l: Locale, kind: MissionKind, ko: string) => (l === "ko" ? ko : MISSION_EN[kind]);

// 레이스 토스트(코어가 만드는 한 줄)에서 물고기 이름만 바꾼다. 나머지는 이미 영어(BOOST·LAP 2·MISS...)
const FISH_KO = ["정어리", "고등어", "참치", "황금 청새치"];
export function toast(l: Locale, msg: string) {
  if (l === "ko") return msg;
  for (let i = 0; i < FISH_KO.length; i++) {
    if (msg.startsWith(FISH_KO[i])) return FISH_EN[i] + msg.slice(FISH_KO[i].length);
  }
  return msg;
}

// 코어가 돌려주는 상점·건설 오류 문구
const ERRORS: [RegExp, string][] = [
  [/^이미 시설이 있다$/, "Tile already has a building"],
  [/^모래섬 위에만 지을 수 있다$/, "Build this on sand"],
  [/^바다 위에만 지을 수 있다$/, "Build this on water"],
  [/^부두 옆에만 정박할 수 있다$/, "Must be moored next to a dock"],
  [/^돈이 부족하다$/, "Not enough CR"],
  [/^이미 모래섬이다$/, "Already sand"],
  [/^시설을 먼저 치워야 한다$/, "Remove the building first"],
  [/^섬에 붙여서만 메울 수 있다$/, "Must touch your island"],
  [/^팔 시설이 없다$/, "Nothing to sell here"],
  [/^정박 중인 요트가 있다$/, "A yacht is moored here"],
  [/^(\d+) CR 부족$/, "Need $1 more CR"],
  [/^이미 가진 스킨$/, "Already owned"],
  [/^서포터 팩 전용 스킨$/, "Supporter pack exclusive"],
  [/^아직 없는 스킨$/, "Not owned yet"],
  [/^없는 스킨$/, "Unknown skin"],
];
export function errorText(l: Locale, msg: string) {
  if (l === "ko" || !msg) return msg;
  for (const [re, en] of ERRORS) {
    if (re.test(msg)) return msg.replace(re, en);
  }
  return msg;
}

// 시설 효과 한 줄 (코어 perkLabel의 영어판)
export function perkLabelLoc(l: Locale, koLabel: string, p: Partial<RacePerks>) {
  if (l === "ko") return koLabel;
  const parts: string[] = [];
  if (p.prize) parts.push(`Prize +${Math.round(p.prize * 100)}%`);
  if (p.fish) parts.push(`Fishing +${Math.round(p.fish * 100)}%`);
  if (p.startSpeed) parts.push(`Start dash +${Math.round(p.startSpeed * 3.6)}km/h`);
  if (p.boost) parts.push(`Boost +${Math.round(p.boost * 100)}%`);
  return parts.join(" · ");
}
