import type { Metadata, Viewport } from "next";

// /boat, /boat3d 공통 메타데이터: 검색·공유 미리보기·홈 화면 추가
const DESCRIPTION = "3분 제트스키 레이스로 순위를 가리고, 낚시와 상금으로 나만의 요트 파라다이스를 짓는 브라우저 게임.";

export function gameMetadata(title: string, path: string): Metadata {
  const site = process.env.NEXT_PUBLIC_SITE_URL; // 배포 주소 (예: https://yacht.example.com). 공유 미리보기 이미지의 절대 주소에 쓴다
  return {
    metadataBase: site ? new URL(site) : undefined,
    title,
    description: DESCRIPTION,
    manifest: "/boat/manifest.webmanifest",
    icons: { icon: "/boat/icon-192.png", apple: "/boat/icon-192.png" },
    alternates: { canonical: path },
    openGraph: {
      title,
      description: DESCRIPTION,
      type: "website",
      url: path,
      images: [{ url: "/boat/og.jpg", width: 1200, height: 630, alt: "요트 파라다이스 레이싱" }],
    },
    twitter: { card: "summary_large_image", title, description: DESCRIPTION, images: ["/boat/og.jpg"] },
  };
}

export const gameViewport: Viewport = { themeColor: "#0369a1", width: "device-width", initialScale: 1, viewportFit: "cover" };
