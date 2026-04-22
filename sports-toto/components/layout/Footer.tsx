import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-(--border)">
      <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-(--muted-foreground) space-y-3">
        <p className="leading-relaxed">
          <strong>SIMULATION ONLY.</strong> 본 프로젝트는 교육/포트폴리오
          목적의 데모로, 라이선스를 받은 도박 서비스가 아닙니다. Sports Toto
          Malaysia Sdn Bhd 와 무관합니다. 실제 수수료, 베팅, 현금 인출이
          발생하지 않습니다.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/responsible-gaming" className="hover:underline">
            책임 게이밍
          </Link>
          <Link href="/how-to-play" className="hover:underline">
            이용 방법
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} Demo Toto MY</p>
      </div>
    </footer>
  );
}
