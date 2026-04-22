import Link from "next/link";

const NAV = [
  { href: "/account", label: "대시보드" },
  { href: "/account/bets", label: "내 베팅" },
  { href: "/account/wallet", label: "지갑" },
  { href: "/account/settings", label: "설정" },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex gap-2 overflow-x-auto mb-6 border-b border-(--border)">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="px-3 py-2 text-sm whitespace-nowrap border-b-2 border-transparent hover:border-(--brand)"
          >
            {n.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
