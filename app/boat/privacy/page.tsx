import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침 · 요트 파라다이스 레이싱" };

// 출시 전 사업자 정보·연락처·시행일을 실제 값으로 채울 것 (docs/LAUNCH.md)
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6 text-sm leading-7 text-slate-800">
      <h1 className="text-2xl font-black">개인정보처리방침</h1>
      <p>요트 파라다이스 레이싱(이하 &ldquo;게임&rdquo;)은 회원가입 없이 이용하며, 운영자는 이름·이메일 등 개인을 알아볼 수 있는 정보를 직접 수집하지 않습니다.</p>

      <h2 className="text-lg font-bold">1. 기기에 저장하는 정보</h2>
      <p>게임 진행(보유 금액, 섬 건설, 업그레이드, 기록, 스킨, 미션, 설정)은 이용자 브라우저의 로컬 저장소(localStorage)에만 저장되며 운영자 서버로 전송되지 않습니다. 브라우저 데이터를 지우면 진행도 함께 삭제됩니다.</p>

      <h2 className="text-lg font-bold">2. 광고</h2>
      <p>게임을 게임 포털(예: Poki, CrazyGames)에서 이용하는 경우, 광고는 해당 포털과 그 광고 파트너가 제공하며 쿠키·광고 식별자 등을 그들의 개인정보처리방침에 따라 처리할 수 있습니다. 보상형 광고는 이용자가 직접 선택했을 때만 재생됩니다.</p>

      <h2 className="text-lg font-bold">3. 결제</h2>
      <p>서포터 팩 등 유료 상품의 결제는 이용 중인 플랫폼의 결제 대행사가 처리하며, 운영자는 카드번호 등 결제 정보를 받지 않습니다.</p>

      <h2 className="text-lg font-bold">4. 아동</h2>
      <p>게임은 개인정보를 수집하지 않으며, 광고는 플랫폼의 연령별 정책에 따라 제공됩니다.</p>

      <h2 className="text-lg font-bold">5. 문의</h2>
      <p>개인정보 관련 문의: 운영자 연락처를 출시 전에 기재합니다.</p>
      <p className="text-xs text-slate-500">시행일: 출시일에 맞춰 기재</p>

      <a href="/boat3d" className="inline-block rounded bg-slate-900 px-4 py-2 font-bold text-white">게임으로 돌아가기</a>
    </main>
  );
}
