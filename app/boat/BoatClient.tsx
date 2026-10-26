"use client";

import dynamic from "next/dynamic";

// 저장 데이터를 localStorage에서 읽으므로 SSR 비활성화
const BoatApp = dynamic(() => import("@/components/boat/BoatApp"), { ssr: false });

export default function BoatClient() {
  return <BoatApp />;
}
