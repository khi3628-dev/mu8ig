"use client";

import { useEffect, useState } from "react";
import { useT } from "@/app/components/shared/T";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function TranscriptEditor({ value, onChange }: Props) {
  const t = useT();
  const [local, setLocal] = useState(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{t("vs.transcript")}</div>
      <textarea
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={t("vs.textFallback")}
        className="w-full min-h-28 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
      />
    </div>
  );
}
