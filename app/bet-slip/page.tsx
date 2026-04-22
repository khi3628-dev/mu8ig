import { BetSlip } from "@/components/betslip/BetSlip";

export default function BetSlipPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold">베팅 슬립</h1>
      <p className="text-sm text-(--muted-foreground)">
        번호를 고른 선택들이 이 브라우저에 저장됩니다. 실제 베팅은 Phase 4
        (로그인/지갑) 이후 활성화됩니다.
      </p>
      <BetSlip />
    </div>
  );
}
