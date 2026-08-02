import { Tag } from "lucide-react";

interface DealCardProps {
  id: string;
  title: string;
  category: string;
  description: string;
  discountLabel: string;
  validTo: string;
}

const CATEGORY_COLOR: Record<string, string> = {
  기프티콘: "bg-amber-100 text-amber-900",
  카드: "bg-blue-100 text-blue-900",
  편의점: "bg-emerald-100 text-emerald-900",
  앱테크: "bg-purple-100 text-purple-900",
};

export function DealCard({
  id,
  title,
  category,
  description,
  discountLabel,
  validTo,
}: DealCardProps) {
  const badge = CATEGORY_COLOR[category] ?? "bg-muted text-foreground";
  return (
    <a
      href={`/api/deals/${id}/click`}
      className="block rounded-2xl border border-border p-4 hover:bg-muted transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
            <Tag size={12} /> {category}
          </div>
          <h3 className="mt-2 font-semibold leading-snug">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-brand">{discountLabel}</div>
          <div className="text-[10px] text-muted-foreground">
            ~{new Date(validTo).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
          </div>
        </div>
      </div>
    </a>
  );
}
