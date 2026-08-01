import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const [topics, user] = await Promise.all([
    prisma.topic.findMany({ orderBy: { slug: "asc" } }),
    getCurrentUser(),
  ]);
  const pref = await prisma.preference.findUnique({
    where: { userId: user.id },
  });

  const initial = {
    topics: pref ? (JSON.parse(pref.topics) as string[]) : ["kr-econ", "it-tech"],
    region: pref?.region ?? "서울",
    commuteStart: pref?.commuteStart ?? "08:00",
    commuteEnd: pref?.commuteEnd ?? "18:30",
    audioEnabled: pref?.audioEnabled ?? true,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">브리핑 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          관심 토픽과 통근 시각을 설정하면 매일 그 시간에 맞춰 3분 브리핑이
          생성됩니다.
        </p>
      </header>
      <OnboardingForm topics={topics} initial={initial} />
    </div>
  );
}
