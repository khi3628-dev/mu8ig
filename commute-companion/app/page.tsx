import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { startOfDayKst } from "@/lib/briefing/generate";
import type { Section } from "@/lib/ai/summarize";
import { BriefingSection } from "@/components/briefing/BriefingSection";
import { PlayAllButton } from "@/components/briefing/PlayAllButton";

export const dynamic = "force-dynamic";

function pickSlot(): "AM" | "PM" {
  const kstHour = (new Date().getUTCHours() + 9) % 24;
  return kstHour < 15 ? "AM" : "PM";
}

export default async function Home() {
  const user = await getCurrentUser();
  const slot = pickSlot();
  const date = startOfDayKst();
  const briefing = await prisma.briefing.findUnique({
    where: { userId_date_slot: { userId: user.id, date, slot } },
  });

  const sections: Section[] = briefing
    ? (JSON.parse(briefing.sections) as Section[])
    : [];

  const fullText = sections
    .map((s, i) => `${i + 1}. ${s.title}. ${s.summary}`)
    .join(" ");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {slot === "AM" ? "출근길 브리핑" : "퇴근길 브리핑"} ·{" "}
          {date.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
        </p>
        <h1 className="text-2xl font-bold">오늘의 3분 브리핑</h1>
      </header>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            오늘의 브리핑이 아직 생성되지 않았어요.
          </p>
          <p className="text-xs text-muted-foreground">
            <code className="rounded bg-muted px-1 py-0.5">
              POST /api/briefing/generate
            </code>{" "}
            를 <code className="rounded bg-muted px-1 py-0.5">x-cron-secret</code>{" "}
            헤더와 함께 호출하세요.
          </p>
          <Link
            href="/onboarding"
            className="inline-block text-sm text-brand hover:underline"
          >
            먼저 관심 토픽 설정하기 →
          </Link>
        </div>
      ) : (
        <>
          <PlayAllButton text={fullText} />
          <div className="space-y-3">
            {sections.map((s, i) => (
              <BriefingSection key={i} section={s} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
