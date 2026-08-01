import { prisma } from "@/lib/db";
import { fetchNewsForTopic } from "@/lib/sources/news";
import { summarizeTopic, type Section } from "@/lib/ai/summarize";

export type Slot = "AM" | "PM";

export function startOfDayKst(d: Date = new Date()): Date {
  // Store as UTC midnight of the same KST date so Prisma's unique
  // (userId, date, slot) is stable regardless of server timezone.
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000);
}

async function loadTopics(slugs: string[]) {
  const topics = await prisma.topic.findMany({ where: { slug: { in: slugs } } });
  const bySlug = new Map(topics.map((t) => [t.slug, t]));
  return slugs.map((s) => bySlug.get(s)).filter((t): t is NonNullable<typeof t> => Boolean(t));
}

export async function generateBriefingForUser(
  userId: string,
  slot: Slot,
  now: Date = new Date()
) {
  const pref = await prisma.preference.findUnique({ where: { userId } });
  if (!pref) throw new Error(`Preference missing for user ${userId}`);

  const topicSlugs: string[] = JSON.parse(pref.topics);
  const topics = await loadTopics(topicSlugs);

  const sections: Section[] = [];
  for (const t of topics) {
    try {
      const news = await fetchNewsForTopic(t.slug, t.naverQuery, 10);
      const section = await summarizeTopic(t.slug, t.label, news);
      sections.push(section);
    } catch (err) {
      console.error(`Topic ${t.slug} failed`, err);
    }
  }

  const date = startOfDayKst(now);
  return prisma.briefing.upsert({
    where: { userId_date_slot: { userId, date, slot } },
    update: { sections: JSON.stringify(sections) },
    create: {
      userId,
      date,
      slot,
      sections: JSON.stringify(sections),
    },
  });
}

/**
 * Cron entry point — generates briefings for every user whose commute
 * time for the given slot matches the current wall clock (± tolerance).
 */
export async function generateBriefingsDueNow(
  slot: Slot,
  now: Date = new Date()
) {
  const preferences = await prisma.preference.findMany({
    include: { user: true },
  });
  const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
  for (const pref of preferences) {
    try {
      await generateBriefingForUser(pref.userId, slot, now);
      results.push({ userId: pref.userId, ok: true });
    } catch (e) {
      results.push({
        userId: pref.userId,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}
