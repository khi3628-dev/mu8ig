import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "통근 컴패니언 — 출근길 3분 AI 브리핑",
  description:
    "사무직 직장인의 출퇴근 시간을 시간·비용 절약에 쓰는 웹앱. 맞춤 뉴스 AI 요약(오디오) + 짠테크 딜 피드.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col">
        <header className="border-b border-border">
          <nav className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="font-bold text-brand text-lg">
              통근 컴패니언
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:text-brand">
                브리핑
              </Link>
              <Link href="/deals" className="hover:text-brand">
                짠테크
              </Link>
              <Link href="/onboarding" className="hover:text-brand">
                설정
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-border text-xs text-muted-foreground">
          <div className="max-w-3xl mx-auto px-4 py-4">
            © 통근 컴패니언 — MVP scaffold. 뉴스 출처는 각 카드 상단에 표기.
          </div>
        </footer>
      </body>
    </html>
  );
}
