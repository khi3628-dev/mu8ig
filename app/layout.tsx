import type { Metadata } from "next";
import "./globals.css";
import { LegalDisclaimerBanner } from "@/components/layout/LegalDisclaimerBanner";
import { AgeGateModal } from "@/components/layout/AgeGateModal";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Demo Toto MY — 숫자 예측 게임 시뮬레이터",
  description:
    "말레이시아 Sports Toto 스타일의 숫자 예측 게임 시뮬레이터. 교육/포트폴리오 목적의 데모입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col">
        <LegalDisclaimerBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <AgeGateModal />
      </body>
    </html>
  );
}
