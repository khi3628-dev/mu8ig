"use client";

import Link from "next/link";
import { Users, Mail, Handshake, ChevronRight } from "lucide-react";
import type { DialogueScenario } from "@/lib/learning/types";
import { useLocaleStore } from "@/app/state/localeStore";
import { useT } from "@/app/components/shared/T";
import { Tag } from "@/app/components/shared/Tag";
import dialoguesData from "@/lib/data/dialogues.json";

const scenarios = dialoguesData as DialogueScenario[];

const domainMeta = {
  meeting: { Icon: Users, tagKey: "dl.domain.meeting" as const },
  email: { Icon: Mail, tagKey: "dl.domain.email" as const },
  negotiation: { Icon: Handshake, tagKey: "dl.domain.negotiation" as const },
};

export function ScenarioList() {
  const locale = useLocaleStore((s) => s.locale);
  const t = useT();
  return (
    <ul className="space-y-3">
      {scenarios.map((s) => {
        const { Icon, tagKey } = domainMeta[s.domain];
        const title = locale === "ko" ? s.title.ko : s.title.en;
        return (
          <li key={s.id}>
            <Link
              href={`/dialogues/${s.id}`}
              className="flex items-center gap-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 hover:border-[var(--brand)] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-muted)] text-[var(--brand)] flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{title}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Tag variant="brand">{t(tagKey)}</Tag>
                  <Tag>{s.kind === "fill-blank" ? "Blanks" : "Order"}</Tag>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
