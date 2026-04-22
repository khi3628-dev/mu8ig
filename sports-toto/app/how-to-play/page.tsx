import Link from "next/link";
import { GAMES } from "@/lib/games/registry";

export default function HowToPlayPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">이용 방법</h1>
        <p className="text-sm text-(--muted-foreground) mt-2">
          본 사이트는 숫자 예측 게임 시뮬레이터입니다. 실제 베팅이 이루어지지
          않으며, 모든 상금은 시뮬레이션 값입니다.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">게임 종류</h2>
        <ul className="space-y-3">
          {GAMES.map((g) => (
            <li key={g.slug} className="rounded-lg border border-(--border) p-4">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/games/${g.slug}`}
                  className="font-semibold hover:underline"
                >
                  {g.name}
                </Link>
                <span className="text-[10px] uppercase tracking-wider text-(--muted-foreground) border border-(--border) rounded px-1.5 py-0.5">
                  {g.kind.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-sm mt-2">{g.tagline}</p>
              <p className="text-xs text-(--muted-foreground) mt-2">
                {g.drawSchedule}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">기본 진행 흐름</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>
            <Link href="/games" className="underline">게임 둘러보기</Link>
            에서 원하는 게임을 선택합니다.
          </li>
          <li>게임 상세 페이지에서 상금 구조와 다음 드로우 일정을 확인합니다.</li>
          <li>
            &quot;번호 선택하기&quot; 로 이동해 번호를 고르고 베팅 슬립을
            만듭니다 (Phase 3에서 제공).
          </li>
          <li>
            드로우가 확정되면{" "}
            <Link href="/results" className="underline">결과 페이지</Link>
            {" "}또는{" "}
            <Link href="/results/check" className="underline">번호 확인</Link>
            {" "}으로 결과를 비교합니다.
          </li>
        </ol>
      </section>
    </div>
  );
}
