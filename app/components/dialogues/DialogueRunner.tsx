"use client";

import type { DialogueScenario } from "@/lib/learning/types";
import { useProgressStore } from "@/app/state/progressStore";
import { FillBlank } from "./FillBlank";
import { SentenceOrder } from "./SentenceOrder";

export function DialogueRunner({ scenario }: { scenario: DialogueScenario }) {
  const recordDaily = useProgressStore((s) => s.recordDaily);

  if (scenario.kind === "fill-blank") {
    return (
      <FillBlank
        scenario={scenario}
        onComplete={() => recordDaily({ dialogueCompleted: true })}
      />
    );
  }
  return (
    <SentenceOrder
      scenario={scenario}
      onComplete={() => recordDaily({ dialogueCompleted: true })}
    />
  );
}
