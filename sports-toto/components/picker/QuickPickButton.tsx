"use client";

export function QuickPickButton({
  onClick,
  label = "Quick Pick",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-(--border) px-3 py-1.5 text-sm hover:bg-(--muted)"
    >
      🎲 {label}
    </button>
  );
}
