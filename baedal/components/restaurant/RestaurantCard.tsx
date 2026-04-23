import Link from "next/link";
import { Star, Clock } from "lucide-react";
import { formatWon } from "@/lib/won";

export interface RestaurantCardData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ratingAvg: number;
  reviewCount: number;
  deliveryMinutesMin: number;
  deliveryMinutesMax: number;
  minOrderWon: number;
  deliveryFeeWon: number;
}

export function RestaurantCard({ r }: { r: RestaurantCardData }) {
  return (
    <Link
      href={`/restaurant/${r.id}`}
      className="flex gap-3 p-3 rounded-lg hover:bg-(--muted)"
    >
      <div className="w-24 h-24 rounded-lg bg-(--muted) overflow-hidden shrink-0">
        {r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.imageUrl}
            alt={r.name}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{r.name}</h3>
        {r.description ? (
          <p className="text-sm text-(--muted-foreground) truncate">
            {r.description}
          </p>
        ) : null}
        <div className="flex items-center gap-1 mt-1 text-sm">
          <Star className="w-4 h-4 fill-(--accent) text-(--accent)" />
          <span className="font-medium">{r.ratingAvg.toFixed(1)}</span>
          <span className="text-(--muted-foreground)">
            ({r.reviewCount.toLocaleString("ko-KR")})
          </span>
          <span className="text-(--muted-foreground) ml-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {r.deliveryMinutesMin}~{r.deliveryMinutesMax}분
          </span>
        </div>
        <div className="mt-1 text-xs text-(--muted-foreground)">
          최소주문 {formatWon(r.minOrderWon)} · 배달비 {formatWon(r.deliveryFeeWon)}
        </div>
      </div>
    </Link>
  );
}
