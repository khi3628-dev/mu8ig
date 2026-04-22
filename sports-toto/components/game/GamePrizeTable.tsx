import { senToMyr } from "@/lib/currency";

type Tier = {
  rank: number;
  label: string;
  payoutSen: number;
  odds: string | null;
};

export function GamePrizeTable({ tiers }: { tiers: Tier[] }) {
  const sorted = [...tiers].sort((a, b) => a.rank - b.rank);
  return (
    <div className="overflow-hidden rounded-lg border border-(--border)">
      <table className="w-full text-sm">
        <thead className="bg-(--muted) text-(--muted-foreground)">
          <tr>
            <th className="text-left px-3 py-2 w-12">#</th>
            <th className="text-left px-3 py-2">등급</th>
            <th className="text-right px-3 py-2">상금</th>
            <th className="text-right px-3 py-2 hidden sm:table-cell">확률</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.rank} className="border-t border-(--border)">
              <td className="px-3 py-2 font-mono text-(--muted-foreground)">
                {t.rank}
              </td>
              <td className="px-3 py-2">{t.label}</td>
              <td className="px-3 py-2 text-right font-medium">
                {senToMyr(t.payoutSen)}
              </td>
              <td className="px-3 py-2 text-right text-(--muted-foreground) hidden sm:table-cell">
                {t.odds ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
