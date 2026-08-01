"use client";

import { useLocaleStore } from "@/app/state/localeStore";
import { t, type MessageKey } from "@/lib/learning/i18n";

interface Props {
  k: MessageKey;
  vars?: Record<string, string | number>;
}

export function T({ k, vars }: Props) {
  const locale = useLocaleStore((s) => s.locale);
  return <>{t(locale, k, vars)}</>;
}

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return (k: MessageKey, vars?: Record<string, string | number>) =>
    t(locale, k, vars);
}
