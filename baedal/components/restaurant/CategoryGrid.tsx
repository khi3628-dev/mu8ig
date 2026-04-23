import Link from "next/link";
import {
  Drumstick,
  Pizza,
  UtensilsCrossed,
  Soup,
  Fish,
  Sandwich,
  Coffee,
  Moon,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  drumstick: Drumstick,
  pizza: Pizza,
  noodles: UtensilsCrossed,
  rice: Soup,
  "fish-cake": Fish,
  burger: Sandwich,
  coffee: Coffee,
  moon: Moon,
};

export interface CategoryGridItem {
  slug: string;
  name: string;
  iconKey: string;
}

export function CategoryGrid({ items }: { items: CategoryGridItem[] }) {
  return (
    <ul className="grid grid-cols-4 gap-2 p-4">
      {items.map((c) => {
        const Icon = ICONS[c.iconKey] ?? UtensilsCrossed;
        return (
          <li key={c.slug}>
            <Link
              href={`/c/${c.slug}`}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-(--muted)"
            >
              <span className="w-12 h-12 rounded-full bg-(--muted) grid place-items-center">
                <Icon className="w-6 h-6 text-(--brand)" />
              </span>
              <span className="text-xs font-medium">{c.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
