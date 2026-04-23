"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCartStore, cartSubtotalWon } from "@/state/cartStore";
import { useHasMounted } from "@/lib/useHasMounted";
import { formatWon } from "@/lib/won";

export default function CartPage() {
  const router = useRouter();
  const mounted = useHasMounted();
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const restaurantName = useCartStore((s) => s.restaurantName);
  const minOrderWon = useCartStore((s) => s.minOrderWon);
  const deliveryFeeWon = useCartStore((s) => s.deliveryFeeWon);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);

  if (!mounted) return null;

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <ShoppingBag className="w-12 h-12 text-(--muted-foreground) mb-3" />
        <h2 className="font-bold text-lg">장바구니가 비어 있어요</h2>
        <p className="text-sm text-(--muted-foreground) mt-1">
          맛있는 메뉴를 담아 보세요.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center h-10 px-4 rounded-md bg-(--brand) text-(--brand-foreground) text-sm font-semibold"
        >
          가게 둘러보기
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotalWon(lines);
  const total = subtotal + deliveryFeeWon;
  const short = minOrderWon - subtotal;
  const canCheckout = short <= 0;

  return (
    <div className="pb-6">
      <div className="px-4 py-3 border-b border-(--border) flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="font-bold">장바구니</h1>
          {restaurantId ? (
            <Link
              href={`/restaurant/${restaurantId}`}
              className="text-sm text-(--muted-foreground) truncate block"
            >
              {restaurantName}
            </Link>
          ) : null}
        </div>
        <button
          onClick={clear}
          className="text-sm text-(--muted-foreground) hover:text-(--danger)"
        >
          전체 삭제
        </button>
      </div>

      <ul className="divide-y divide-(--border)">
        {lines.map((l) => (
          <li key={l.id} className="p-4 flex gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{l.name}</h3>
              {l.options.length > 0 ? (
                <p className="text-xs text-(--muted-foreground)">
                  {l.options.map((o) => o.name).join(" · ")}
                </p>
              ) : null}
              <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center border border-(--border) rounded-full">
                  <button
                    className="w-8 h-8 grid place-items-center"
                    onClick={() => updateQuantity(l.id, l.quantity - 1)}
                    aria-label="수량 감소"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm">{l.quantity}</span>
                  <button
                    className="w-8 h-8 grid place-items-center"
                    onClick={() => updateQuantity(l.id, l.quantity + 1)}
                    aria-label="수량 증가"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeLine(l.id)}
                  aria-label="삭제"
                  className="ml-auto text-(--muted-foreground) hover:text-(--danger)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-right font-semibold">
              {formatWon(l.unitPriceWon * l.quantity)}
            </div>
          </li>
        ))}
      </ul>

      <div className="px-4 py-3 space-y-1 text-sm border-t border-(--border)">
        <div className="flex justify-between">
          <span className="text-(--muted-foreground)">주문 금액</span>
          <span>{formatWon(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-(--muted-foreground)">배달비</span>
          <span>{formatWon(deliveryFeeWon)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-(--border) mt-2 font-semibold">
          <span>결제 예정 금액</span>
          <span>{formatWon(total)}</span>
        </div>
      </div>

      {short > 0 ? (
        <p className="px-4 pb-2 text-sm text-(--danger)">
          최소주문 금액까지 {formatWon(short)} 남았어요.
        </p>
      ) : null}

      <div className="px-4 pt-2">
        <Button
          size="lg"
          className="w-full"
          disabled={!canCheckout}
          onClick={() => router.push("/checkout")}
        >
          {canCheckout
            ? `${formatWon(total)} 주문하기`
            : `최소주문 ${formatWon(minOrderWon)} 이상`}
        </Button>
      </div>
    </div>
  );
}
