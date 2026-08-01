import type { Section } from "@/lib/ai/summarize";

export function BriefingSection({ section, index }: { section: Section; index: number }) {
  return (
    <article className="rounded-2xl border border-border p-5 bg-background">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
          #{index + 1}
        </span>
        <span>{section.source || "출처 확인 필요"}</span>
      </div>
      <h2 className="mt-2 text-lg font-semibold leading-snug">{section.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {section.summary}
      </p>
      {section.sourceUrl && (
        <a
          href={section.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-block text-xs text-brand hover:underline"
        >
          원문 기사 →
        </a>
      )}
    </article>
  );
}
