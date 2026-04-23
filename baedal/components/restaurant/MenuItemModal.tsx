"use client";

import { useMemo, useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatWon } from "@/lib/won";
import { useCartStore, type CartOption } from "@/state/cartStore";

export interface MenuItemOption {
  id: string;
  groupName: string;
  name: string;
  extraPriceWon: number;
  isRequired: boolean;
}

export interface MenuItemForModal {
  id: string;
  name: string;
  description: string | null;
  priceWon: number;
  options: MenuItemOption[];
}

interface Props {
  item: MenuItemForModal;
  restaurant: {
    id: string;
    name: string;
    minOrderWon: number;
    deliveryFeeWon: number;
  };
  onClose: () => void;
}

export function MenuItemModal({ item, restaurant, onClose }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<null | {
    line: {
      menuItemId: string;
      name: string;
      unitPriceWon: number;
      quantity: number;
      options: CartOption[];
    };
  }>(null);

  const addLine = useCartStore((s) => s.addLine);
  const forceReplace = useCartStore((s) => s.forceReplaceRestaurant);

  const groups = useMemo(() => {
    const map = new Map<string, MenuItemOption[]>();
    for (const o of item.options) {
      if (!map.has(o.groupName)) map.set(o.groupName, []);
      map.get(o.groupName)!.push(o);
    }
    return Array.from(map.entries());
  }, [item.options]);

  const chosenOptions: CartOption[] = groups
    .map(([groupName, opts]) => {
      const id = selected[groupName];
      const o = opts.find((x) => x.id === id);
      if (!o) return null;
      return {
        groupName,
        name: o.name,
        extraPriceWon: o.extraPriceWon,
      };
    })
    .filter((x): x is CartOption => x !== null);

  const unitPriceWon =
    item.priceWon +
    chosenOptions.reduce((sum, o) => sum + o.extraPriceWon, 0);
  const totalWon = unitPriceWon * quantity;

  const missingRequired = groups
    .filter(([, opts]) => opts.some((o) => o.isRequired))
    .filter(([groupName]) => !selected[groupName])
    .map(([groupName]) => groupName);

  function handleAdd() {
    if (missingRequired.length > 0) {
      setWarning(`${missingRequired.join(", ")}을(를) 선택해 주세요.`);
      return;
    }
    const line = {
      menuItemId: item.id,
      name: item.name,
      unitPriceWon,
      quantity,
      options: chosenOptions,
    };
    const res = addLine({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      minOrderWon: restaurant.minOrderWon,
      deliveryFeeWon: restaurant.deliveryFeeWon,
      line,
    });
    if (!res.ok && res.reason === "DIFFERENT_RESTAURANT") {
      setConfirmReplace({ line });
      return;
    }
    onClose();
  }

  function handleConfirmReplace() {
    if (!confirmReplace) return;
    forceReplace({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      minOrderWon: restaurant.minOrderWon,
      deliveryFeeWon: restaurant.deliveryFeeWon,
      line: confirmReplace.line,
    });
    setConfirmReplace(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-(--background) rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-(--background) flex items-center justify-between p-4 border-b border-(--border)">
          <h2 className="font-bold">{item.name}</h2>
          <button onClick={onClose} aria-label="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {item.description ? (
            <p className="text-sm text-(--muted-foreground)">
              {item.description}
            </p>
          ) : null}
          <p className="font-semibold">{formatWon(item.priceWon)}</p>

          {groups.map(([groupName, opts]) => (
            <fieldset key={groupName} className="space-y-2">
              <legend className="font-semibold text-sm">
                {groupName}
                {opts.some((o) => o.isRequired) ? (
                  <span className="ml-2 text-(--brand) text-xs">필수</span>
                ) : null}
              </legend>
              <div className="space-y-1">
                {opts.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-2 p-2 rounded border border-(--border) cursor-pointer has-[:checked]:border-(--brand) has-[:checked]:bg-(--brand)/5"
                  >
                    <input
                      type="radio"
                      name={groupName}
                      checked={selected[groupName] === o.id}
                      onChange={() =>
                        setSelected((s) => ({ ...s, [groupName]: o.id }))
                      }
                    />
                    <span className="flex-1 text-sm">{o.name}</span>
                    {o.extraPriceWon > 0 ? (
                      <span className="text-sm text-(--muted-foreground)">
                        +{formatWon(o.extraPriceWon)}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="flex items-center justify-between pt-2">
            <span className="font-semibold text-sm">수량</span>
            <div className="inline-flex items-center gap-2 border border-(--border) rounded-full">
              <button
                className="w-9 h-9 grid place-items-center"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="수량 감소"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center">{quantity}</span>
              <button
                className="w-9 h-9 grid place-items-center"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                aria-label="수량 증가"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {warning ? (
            <p className="text-sm text-(--danger)">{warning}</p>
          ) : null}
        </div>
        <div className="sticky bottom-0 p-4 bg-(--background) border-t border-(--border)">
          <Button
            size="lg"
            className="w-full"
            onClick={handleAdd}
            disabled={missingRequired.length > 0}
          >
            {formatWon(totalWon)} 담기
          </Button>
        </div>
      </div>

      {confirmReplace ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
          <div className="bg-(--background) rounded-xl max-w-sm w-full p-5 space-y-3">
            <h3 className="font-bold">다른 가게 메뉴를 담을까요?</h3>
            <p className="text-sm text-(--muted-foreground)">
              장바구니에는 한 가게의 메뉴만 담을 수 있어요. 기존 장바구니를
              비우고 담을까요?
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmReplace(null)}
              >
                취소
              </Button>
              <Button className="flex-1" onClick={handleConfirmReplace}>
                장바구니 비우고 담기
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
