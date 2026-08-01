"use client";

import { ScenarioList } from "@/app/components/dialogues/ScenarioList";
import { useT } from "@/app/components/shared/T";

export default function DialoguesHome() {
  const t = useT();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{t("dl.title")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("dl.subtitle")}
        </p>
      </header>
      <ScenarioList />
    </div>
  );
}
