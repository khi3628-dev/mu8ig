import Link from "next/link";
import { GAMES } from "@/lib/games/registry";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <section className="mb-10 sm:mb-14">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Demo Toto MY
        </h1>
        <p className="text-(--muted-foreground) max-w-2xl leading-relaxed">
          말레이시아 Sports Toto 를 참고한 숫자 예측 게임 시뮬레이터입니다.
          7개의 게임, 과거 결과 조회, 번호 선택 시뮬레이터를 제공합니다.
          <strong className="text-(--foreground)"> 실제 베팅은 이루어지지 않습니다.</strong>
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          <Link
            href="/games"
            className="inline-flex items-center rounded-md bg-(--brand) text-(--brand-foreground) px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            게임 둘러보기
          </Link>
          <Link
            href="/results"
            className="inline-flex items-center rounded-md border border-(--border) px-4 py-2 text-sm font-medium hover:bg-(--muted)"
          >
            최신 결과
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">제공 게임</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GAMES.map((g) => (
            <Link
              key={g.slug}
              href={`/games/${g.slug}`}
              className="block rounded-lg border border-(--border) p-4 hover:bg-(--muted) transition"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-semibold">{g.name}</div>
                <span className="text-[10px] uppercase tracking-wider text-(--muted-foreground) border border-(--border) rounded px-1.5 py-0.5">
                  {g.kind.replace("_", " ")}
                </span>
              </div>
              <div className="text-xs text-(--muted-foreground) mb-2">
                {g.nameKo}
              </div>
              <div className="text-sm">{g.tagline}</div>
              <div className="text-xs text-(--muted-foreground) mt-3">
                {g.drawSchedule}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
