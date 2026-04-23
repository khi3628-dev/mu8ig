"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCartStore, cartSubtotalWon } from "@/state/cartStore";
import { useHasMounted } from "@/lib/useHasMounted";
import { formatWon } from "@/lib/won";

interface Address {
  id: string;
  label: string;
  roadAddress: string;
  detail: string | null;
  isDefault: boolean;
}

const PAYMENTS: { value: "CARD" | "CASH" | "PAY"; label: string }[] = [
  { value: "CARD", label: "신용/체크카드" },
  { value: "PAY", label: "간편결제" },
  { value: "CASH", label: "만나서 현금결제" },
];

export function CheckoutForm({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const mounted = useHasMounted();
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const restaurantName = useCartStore((s) => s.restaurantName);
  const minOrderWon = useCartStore((s) => s.minOrderWon);
  const deliveryFeeWon = useCartStore((s) => s.deliveryFeeWon);
  const clear = useCartStore((s) => s.clear);

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string | undefined>(
    defaultAddress?.id,
  );
  const [payment, setPayment] = useState<"CARD" | "CASH" | "PAY">("CARD");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mounted) return null;

  if (lines.length === 0 || !restaurantId) {
    return (
      <div className="py-16 text-center">
        <p className="text-(--muted-foreground)">장바구니가 비어 있어요.</p>
        <Link
          href="/"
          className="mt-3 inline-block text-(--brand) font-medium"
        >
          가게 보러 가기
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotalWon(lines);
  const total = subtotal + deliveryFeeWon;

  async function handleSubmit() {
    if (!addressId) {
      setError("배송지를 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        addressId,
        lines: lines.map((l) => ({
          menuItemId: l.menuItemId,
          name: l.name,
          unitPriceWon: l.unitPriceWon,
          quantity: l.quantity,
          options: l.options,
        })),
        paymentMethod: payment,
        instructions: instructions || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "주문 생성에 실패했어요.");
      return;
    }
    const data = await res.json();
    clear();
    router.push(`/orders/${data.id}`);
  }

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-(--border)">
        <Link href="/cart" aria-label="뒤로">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold">주문하기</h1>
      </div>

      <section className="p-4 border-b border-(--border)">
        <h2 className="font-semibold mb-2">가게</h2>
        <p className="text-sm">{restaurantName}</p>
      </section>

      <section className="p-4 border-b border-(--border)">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">배송지</h2>
          <Link
            href="/account/addresses"
            className="text-sm text-(--brand)"
          >
            관리
          </Link>
        </div>
        {addresses.length === 0 ? (
          <p className="text-sm text-(--muted-foreground)">
            먼저 배송지를 추가해 주세요.
          </p>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className="flex items-start gap-2 p-2 rounded border border-(--border) cursor-pointer has-[:checked]:border-(--brand) has-[:checked]:bg-(--brand)/5"
              >
                <input
                  type="radio"
                  name="address"
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                  className="mt-1"
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">{a.label}</div>
                  <div>{a.roadAddress}</div>
                  {a.detail ? (
                    <div className="text-(--muted-foreground)">{a.detail}</div>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="p-4 border-b border-(--border)">
        <h2 className="font-semibold mb-2">요청사항</h2>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={200}
          placeholder="예) 문 앞에 놔 주세요, 연락 없이 주세요"
          className="w-full p-3 rounded-md border border-(--border) text-sm resize-none h-20"
        />
      </section>

      <section className="p-4 border-b border-(--border)">
        <h2 className="font-semibold mb-2">결제수단 (Mock)</h2>
        <div className="space-y-1">
          {PAYMENTS.map((p) => (
            <label
              key={p.value}
              className="flex items-center gap-2 p-2 rounded border border-(--border) cursor-pointer has-[:checked]:border-(--brand) has-[:checked]:bg-(--brand)/5"
            >
              <input
                type="radio"
                name="payment"
                checked={payment === p.value}
                onChange={() => setPayment(p.value)}
              />
              <span className="text-sm">{p.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="p-4 border-b border-(--border) text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-(--muted-foreground)">주문 금액</span>
          <span>{formatWon(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-(--muted-foreground)">배달비</span>
          <span>{formatWon(deliveryFeeWon)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-(--border) mt-2 font-semibold">
          <span>총 결제 금액</span>
          <span>{formatWon(total)}</span>
        </div>
      </section>

      {error ? <p className="px-4 pt-2 text-sm text-(--danger)">{error}</p> : null}

      <div className="p-4">
        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={submitting || subtotal < minOrderWon || !addressId}
        >
          {submitting ? "주문 처리 중…" : `${formatWon(total)} 결제하기`}
        </Button>
      </div>
    </div>
  );
}
