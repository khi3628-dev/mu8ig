import Link from "next/link";

type Game = {
  slug: string;
  name: string;
  nameKo: string | null;
  kind: string;
  drawSchedule: string;
  tagline?: string;
};

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="block rounded-lg border border-(--border) p-4 hover:bg-(--muted) transition"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-semibold">{game.name}</div>
        <span className="text-[10px] uppercase tracking-wider text-(--muted-foreground) border border-(--border) rounded px-1.5 py-0.5">
          {game.kind.replace(/_/g, " ")}
        </span>
      </div>
      {game.nameKo ? (
        <div className="text-xs text-(--muted-foreground) mb-2">{game.nameKo}</div>
      ) : null}
      {game.tagline ? <div className="text-sm">{game.tagline}</div> : null}
      <div className="text-xs text-(--muted-foreground) mt-3">
        {game.drawSchedule}
      </div>
    </Link>
  );
}
