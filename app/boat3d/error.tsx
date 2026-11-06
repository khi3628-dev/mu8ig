"use client";

import GameError from "@/components/boat/GameError";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <GameError reset={reset} is3D />;
}
