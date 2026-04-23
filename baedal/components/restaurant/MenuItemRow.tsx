"use client";

import { useState } from "react";
import { formatWon } from "@/lib/won";
import { MenuItemModal, type MenuItemForModal } from "./MenuItemModal";

interface Props {
  item: MenuItemForModal & { imageUrl: string | null; isPopular: boolean };
  restaurant: {
    id: string;
    name: string;
    minOrderWon: number;
    deliveryFeeWon: number;
  };
}

export function MenuItemRow({ item, restaurant }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex gap-3 p-3 text-left hover:bg-(--muted) rounded-lg"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{item.name}</h4>
            {item.isPopular ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-(--brand)/10 text-(--brand) font-medium">
                인기
              </span>
            ) : null}
          </div>
          {item.description ? (
            <p className="text-sm text-(--muted-foreground) line-clamp-2">
              {item.description}
            </p>
          ) : null}
          <p className="mt-1 font-semibold">{formatWon(item.priceWon)}</p>
        </div>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-20 h-20 rounded-lg object-cover shrink-0"
          />
        ) : null}
      </button>
      {open ? (
        <MenuItemModal
          item={item}
          restaurant={restaurant}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
