"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrderStatusTimeline } from "@/components/order/OrderStatusTimeline";
import {
  isTerminal,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "@/lib/orderStatus";
import { formatWon } from "@/lib/won";

const PAYMENT_LABEL: Record<string, string> = {
  CARD: "신용/체크카드",
  CASH: "만나서 현금결제",
  PAY: "간편결제",
};

interface Props {
  orderId: string;
  initial: {
    status: string;
    placedAt: string;
    estimatedArrivalAt: string;
    completedAt: string | null;
  };
  restaurant: { id: string; name: string; imageUrl: string | null };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceWon: number;
    options: Array<{ groupName: string; name: string }>;
  }>;
  totals: {
    subtotalWon: number;
    deliveryFeeWon: number;
    totalWon: number;
  };
  address: { label: string; roadAddress: string; detail: string | null };
  paymentMethod: string;
  hasReview: boolean;
}

export function OrderDetailClient({
  orderId,
  initial,
  restaurant,
  items,
  totals,
  address,
  paymentMethod,
  hasReview,
}: Props) {
  const [status, setStatus] = useState<OrderStatus>(initial.status as OrderStatus);
  const [estimatedArrivalAt] = useState(initial.estimatedArrivalAt);
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(hasReview);

  useEffect(() => {
    if (isTerminal(status)) return;
    const tick = async () => {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status as OrderStatus);
    };
    const interval = setInterval(tick, 5000);
    tick();
    return () => clearInterval(interval);
  }, [orderId, status]);

  const eta = new Date(estimatedArrivalAt);
  const etaText = eta.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div>
      <section className="p-4 border-b border-(--border)">
        <div className="text-sm text-(--muted-foreground)">
          {isTerminal(status) ? "현재 상태" : "예상 도착 시간"}
        </div>
        <div className="text-xl font-bold mb-4">
          {isTerminal(status) ? ORDER_STATUS_LABEL[status] : etaText}
        </div>
        <OrderStatusTimeline status={status} />
      </section>

      <section className="p-4 border-b border-(--border)">
        <h2 className="font-semibold mb-2">{restaurant.name}</h2>
        <ul className="space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <div className="min-w-0">
                <p>
                  {it.name}{" "}
                  <span className="text-(--muted-foreground)">x{it.quantity}</span>
                </p>
                {it.options.length > 0 ? (
                  <p className="text-xs text-(--muted-foreground)">
                    {it.options.map((o) => o.name).join(" · ")}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0">
                {formatWon(it.unitPriceWon * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="p-4 border-b border-(--border) text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-(--muted-foreground)">주문 금액</span>
          <span>{formatWon(totals.subtotalWon)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-(--muted-foreground)">배달비</span>
          <span>{formatWon(totals.deliveryFeeWon)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-(--border) mt-2 font-semibold">
          <span>총 결제 금액</span>
          <span>{formatWon(totals.totalWon)}</span>
        </div>
      </section>

      <section className="p-4 border-b border-(--border) text-sm space-y-2">
        <div>
          <span className="text-(--muted-foreground) mr-2">배송지</span>
          <span>
            {address.label} · {address.roadAddress}
            {address.detail ? ` ${address.detail}` : ""}
          </span>
        </div>
        <div>
          <span className="text-(--muted-foreground) mr-2">결제수단</span>
          <span>{PAYMENT_LABEL[paymentMethod] ?? paymentMethod}</span>
        </div>
      </section>

      {status === "DELIVERED" && !reviewSubmitted ? (
        <div className="p-4">
          {showReview ? (
            <ReviewForm
              orderId={orderId}
              onDone={() => {
                setShowReview(false);
                setReviewSubmitted(true);
              }}
            />
          ) : (
            <Button className="w-full" onClick={() => setShowReview(true)}>
              리뷰 작성하기
            </Button>
          )}
        </div>
      ) : null}
      {status === "DELIVERED" && reviewSubmitted ? (
        <p className="p-4 text-center text-sm text-(--muted-foreground)">
          리뷰를 남겨 주셔서 감사합니다.
        </p>
      ) : null}
    </div>
  );
}

function ReviewForm({
  orderId,
  onDone,
}: {
  orderId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, rating, body: body || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setError(b?.error ?? "리뷰 작성에 실패했어요.");
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-(--border) rounded-lg p-4">
      <div>
        <p className="font-semibold mb-2">별점</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n}점`}
            >
              <Star
                className={
                  n <= rating
                    ? "w-7 h-7 fill-(--accent) text-(--accent)"
                    : "w-7 h-7 text-(--muted-foreground)"
                }
              />
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-sm font-medium">리뷰 내용 (선택)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          className="mt-1 w-full p-3 rounded-md border border-(--border) text-sm h-24"
          placeholder="맛, 양, 배달 시간 등 의견을 들려주세요"
        />
      </label>
      {error ? <p className="text-sm text-(--danger)">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "등록 중…" : "리뷰 등록"}
      </Button>
    </form>
  );
}
