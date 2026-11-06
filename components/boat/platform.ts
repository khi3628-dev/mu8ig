// 광고·결제 플랫폼 연결부. 게임 코드는 이 인터페이스만 부르고, 실제 SDK는 여기서만 다룬다.
//
// 고르는 법: 주소 뒤 ?platform=poki | crazygames | dev, 없으면 NEXT_PUBLIC_GAME_PLATFORM, 그것도 없으면
//   개발 중(next dev)엔 dev(가짜 광고), 배포본엔 none(광고·결제 없음 — 버튼이 숨는다).
// 배포본에서 가짜 광고로 보상을 주는 일이 없도록 dev는 명시하거나 개발 서버일 때만 켠다.
//
// SDK 호출 이름은 각 플랫폼 공개 문서 기준이다. 실제 포털 심사 전에 그쪽 테스트 도구로 꼭 확인할 것 (docs/LAUNCH.md).

export type PlatformName = "none" | "dev" | "poki" | "crazygames";

export interface Platform {
  name: PlatformName;
  rewardedAvailable: boolean; // 보상형 광고 버튼을 보여 줄지
  purchaseAvailable: boolean; // 서포터 팩 구매 버튼을 보여 줄지
  init(): Promise<void>;
  gameplayStart(): void;
  gameplayStop(): void;
  // 끝까지 봤으면 true (그때만 보상)
  rewarded(): Promise<boolean>;
  interstitial(): Promise<void>;
  purchase(product: "supporter"): Promise<boolean>;
}

// 광고가 도는 동안 게임 소리를 끈다 (포털 정책). BoatApp이 등록한다
let audioPause: (paused: boolean) => void = () => {};
export function onAdAudio(fn: (paused: boolean) => void) {
  audioPause = fn;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`load failed: ${src}`));
    document.head.appendChild(s);
  });
}

// ── 개발용: 화면에 3초짜리 가짜 광고를 띄운다 ──
function devAd(label: string, seconds: number) {
  return new Promise<boolean>((resolve) => {
    const el = document.createElement("div");
    el.setAttribute("role", "dialog");
    el.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:12px;background:rgba(2,6,23,.92);color:#fff;font:600 16px system-ui,sans-serif;text-align:center";
    const close = document.createElement("button");
    close.textContent = "건너뛰기 (보상 없음)";
    close.style.cssText = "margin-top:8px;padding:6px 14px;border:1px solid rgba(255,255,255,.4);background:none;color:#fff;font-size:13px";
    const text = document.createElement("div");
    el.append(text, close);
    document.body.appendChild(el);
    let left = seconds;
    const draw = () => (text.innerHTML = `<div style="font-size:12px;letter-spacing:.3em;opacity:.6">DEV AD</div>${label}<br><span style="font-size:40px">${left}</span>`);
    draw();
    const timer = setInterval(() => {
      left -= 1;
      if (left <= 0) finish(true);
      else draw();
    }, 1000);
    const finish = (ok: boolean) => {
      clearInterval(timer);
      el.remove();
      resolve(ok);
    };
    close.onclick = () => finish(false);
  });
}

async function withAudioPaused<T>(run: () => Promise<T>): Promise<T> {
  audioPause(true);
  try {
    return await run();
  } finally {
    audioPause(false);
  }
}

const none: Platform = {
  name: "none",
  rewardedAvailable: false,
  purchaseAvailable: false,
  init: async () => {},
  gameplayStart() {},
  gameplayStop() {},
  rewarded: async () => false,
  interstitial: async () => {},
  purchase: async () => false,
};

const dev: Platform = {
  ...none,
  name: "dev",
  rewardedAvailable: true,
  purchaseAvailable: true,
  rewarded: () => withAudioPaused(() => devAd("보상형 광고 자리", 3)),
  interstitial: () => withAudioPaused(async () => void (await devAd("레이스 사이 광고 자리", 2))),
  purchase: async () => window.confirm("[개발용] 서포터 팩 결제를 성공으로 처리할까요? 실제 결제는 일어나지 않습니다."),
};

// ── Poki (https://sdk.poki.com) ──
interface PokiSDK {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<void>;
  rewardedBreak(onStart?: () => void): Promise<boolean>;
}
function poki(): Platform {
  const sdk = () => (window as unknown as { PokiSDK?: PokiSDK }).PokiSDK;
  return {
    ...none,
    name: "poki",
    rewardedAvailable: true,
    async init() {
      await loadScript("https://game-cdn.poki.com/scripts/v2/poki-sdk.js");
      await sdk()?.init();
      sdk()?.gameLoadingFinished();
    },
    gameplayStart: () => sdk()?.gameplayStart(),
    gameplayStop: () => sdk()?.gameplayStop(),
    rewarded: () => withAudioPaused(async () => (await sdk()?.rewardedBreak()) ?? false),
    interstitial: () => withAudioPaused(async () => void (await sdk()?.commercialBreak())),
  };
}

// ── CrazyGames SDK v3 (https://docs.crazygames.com) ──
interface CrazySDK {
  init(): Promise<void>;
  game: { gameplayStart(): void; gameplayStop(): void; loadingStop?(): void };
  ad: { requestAd(type: "midgame" | "rewarded", cb: { adStarted?(): void; adFinished?(): void; adError?(e: unknown): void }): void };
}
function crazygames(): Platform {
  const sdk = () => (window as unknown as { CrazyGames?: { SDK: CrazySDK } }).CrazyGames?.SDK;
  const ad = (type: "midgame" | "rewarded") =>
    withAudioPaused(
      () =>
        new Promise<boolean>((resolve) => {
          const s = sdk();
          if (!s) return resolve(false);
          s.ad.requestAd(type, { adFinished: () => resolve(true), adError: () => resolve(false) });
        }),
    );
  return {
    ...none,
    name: "crazygames",
    rewardedAvailable: true,
    async init() {
      await loadScript("https://sdk.crazygames.com/crazygames-sdk-v3.js");
      await sdk()?.init();
      sdk()?.game.loadingStop?.();
    },
    gameplayStart: () => sdk()?.game.gameplayStart(),
    gameplayStop: () => sdk()?.game.gameplayStop(),
    rewarded: () => ad("rewarded"),
    interstitial: async () => void (await ad("midgame")),
  };
}

export function pickPlatform(search: string, env: string | undefined, isDev: boolean): PlatformName {
  const q = new URLSearchParams(search).get("platform");
  const want = q ?? env ?? (isDev ? "dev" : "none");
  return want === "dev" || want === "poki" || want === "crazygames" ? want : "none";
}

let current: Platform | null = null;

// 한 번만 만든다. SDK를 못 불러오면(차단·오프라인) 광고 없이 계속 진행한다
export async function getPlatform(): Promise<Platform> {
  if (current) return current;
  const name = pickPlatform(window.location.search, process.env.NEXT_PUBLIC_GAME_PLATFORM, process.env.NODE_ENV === "development");
  const p = name === "dev" ? dev : name === "poki" ? poki() : name === "crazygames" ? crazygames() : none;
  try {
    await p.init();
    current = p;
  } catch {
    current = none;
  }
  return current;
}
