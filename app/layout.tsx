import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "./components/layout/AppShell";

export const metadata: Metadata = {
  title: "mu8ig — Business English, gamified",
  description:
    "직장인을 위한 비즈니스 영어 학습. 끝말잇기·표현 카드·다이얼로그·데일리 챌린지·내 말투 → 영어 문장 생성.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
