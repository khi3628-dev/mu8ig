"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DialogueRunner } from "@/app/components/dialogues/DialogueRunner";
import dialoguesData from "@/lib/data/dialogues.json";
import type { DialogueScenario } from "@/lib/learning/types";
import { useT } from "@/app/components/shared/T";
import { useLocaleStore } from "@/app/state/localeStore";

const scenarios = dialoguesData as DialogueScenario[];

export default function DialoguePage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { scenarioId } = use(params);
  const scenario = scenarios.find((s) => s.id === scenarioId);

  if (!scenario) {
    return (
      <div className="space-y-4">
        <Link
          href="/dialogues"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)]"
        >
          <ArrowLeft className="w-4 h-4" /> {t("common.back")}
        </Link>
        <div className="text-center py-10 text-[var(--muted-foreground)]">
          {t("common.empty")}
        </div>
      </div>
    );
  }

  const title = locale === "ko" ? scenario.title.ko : scenario.title.en;

  return (
    <div className="space-y-4">
      <Link
        href="/dialogues"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common.back")}
      </Link>
      <header>
        <h1 className="text-xl font-bold">{title}</h1>
      </header>
      <DialogueRunner scenario={scenario} />
    </div>
  );
}
