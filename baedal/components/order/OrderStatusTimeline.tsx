import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orderStatus";

const VISIBLE: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "COOKING",
  "DELIVERING",
  "DELIVERED",
];

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="p-4 text-center rounded-lg border border-(--border) bg-(--muted)">
        <p className="font-semibold text-(--danger)">주문이 취소되었어요</p>
      </div>
    );
  }

  const currentIdx = VISIBLE.indexOf(status);

  return (
    <ol className="flex items-start justify-between gap-2">
      {VISIBLE.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isLast = i === VISIBLE.length - 1;
        return (
          <li key={s} className="flex-1 flex items-start gap-2">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full grid place-items-center text-xs font-bold",
                  done && "bg-(--brand) text-(--brand-foreground)",
                  active && "bg-(--brand) text-(--brand-foreground) ring-4 ring-(--brand)/20",
                  !done && !active && "bg-(--muted) text-(--muted-foreground)",
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1 text-[11px] text-center leading-tight",
                  (done || active) ? "text-(--foreground) font-medium" : "text-(--muted-foreground)",
                )}
              >
                {ORDER_STATUS_LABEL[s]}
              </span>
            </div>
            {!isLast ? (
              <div
                className={cn(
                  "flex-1 h-0.5 mt-4",
                  done ? "bg-(--brand)" : "bg-(--border)",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
