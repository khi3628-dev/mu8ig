import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "배달 — 오늘 뭐 먹지?",
  description:
    "배달의민족 스타일의 음식 배달 데모 앱. 학습·포트폴리오 목적의 시뮬레이션입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 mx-auto max-w-5xl w-full">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
