"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Address {
  id: string;
  label: string;
  roadAddress: string;
  detail: string | null;
  isDefault: boolean;
}

export function AddressesClient({ initial }: { initial: Address[] }) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "집",
    roadAddress: "",
    detail: "",
    isDefault: false,
  });

  async function refresh() {
    const res = await fetch("/api/addresses");
    if (res.ok) setAddresses(await res.json());
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ label: "집", roadAddress: "", detail: "", isDefault: false });
    setShowForm(false);
    refresh();
  }

  async function setDefault(id: string) {
    await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-(--border)">
        <Link href="/account" aria-label="뒤로">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold">배송지 관리</h1>
      </div>

      {addresses.length === 0 ? (
        <p className="p-6 text-center text-(--muted-foreground)">
          등록된 배송지가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-(--border)">
          {addresses.map((a) => (
            <li key={a.id} className="p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.label}</span>
                  {a.isDefault ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-(--brand)/10 text-(--brand)">
                      기본
                    </span>
                  ) : null}
                </div>
                <p className="text-sm">{a.roadAddress}</p>
                {a.detail ? (
                  <p className="text-sm text-(--muted-foreground)">{a.detail}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {!a.isDefault ? (
                  <button
                    onClick={() => setDefault(a.id)}
                    className="p-2 hover:bg-(--muted) rounded"
                    aria-label="기본으로 설정"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  onClick={() => remove(a.id)}
                  className="p-2 hover:bg-(--muted) rounded text-(--muted-foreground) hover:text-(--danger)"
                  aria-label="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="p-4">
        {showForm ? (
          <form
            onSubmit={handleCreate}
            className="space-y-3 border border-(--border) rounded-lg p-4"
          >
            <label className="block">
              <span className="text-sm font-medium">라벨</span>
              <input
                type="text"
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="mt-1 w-full h-10 px-3 rounded-md border border-(--border)"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">도로명 주소</span>
              <input
                type="text"
                required
                value={form.roadAddress}
                onChange={(e) =>
                  setForm({ ...form, roadAddress: e.target.value })
                }
                className="mt-1 w-full h-10 px-3 rounded-md border border-(--border)"
                placeholder="서울 강남구 테헤란로 123"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">상세 주소</span>
              <input
                type="text"
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                className="mt-1 w-full h-10 px-3 rounded-md border border-(--border)"
                placeholder="101동 1001호"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
              />
              기본 배송지로 설정
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                취소
              </Button>
              <Button type="submit" className="flex-1">
                추가
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShowForm(true)}
          >
            + 새 주소 추가
          </Button>
        )}
      </div>
    </div>
  );
}
