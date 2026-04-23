import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { MapPin, LogOut, Receipt } from "lucide-react";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold">{user.name ?? "회원"}</h1>
        <p className="text-sm text-(--muted-foreground)">{user.email}</p>
      </div>
      <ul className="divide-y divide-(--border) border-t border-b border-(--border)">
        <li>
          <Link href="/account/addresses" className="flex items-center gap-3 p-4 hover:bg-(--muted)">
            <MapPin className="w-5 h-5 text-(--brand)" />
            <span className="flex-1 font-medium">배송지 관리</span>
          </Link>
        </li>
        <li>
          <Link href="/orders" className="flex items-center gap-3 p-4 hover:bg-(--muted)">
            <Receipt className="w-5 h-5 text-(--brand)" />
            <span className="flex-1 font-medium">주문 내역</span>
          </Link>
        </li>
        <li>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="w-full flex items-center gap-3 p-4 hover:bg-(--muted) text-left">
              <LogOut className="w-5 h-5 text-(--muted-foreground)" />
              <span className="flex-1 font-medium">로그아웃</span>
            </button>
          </form>
        </li>
      </ul>
    </div>
  );
}
