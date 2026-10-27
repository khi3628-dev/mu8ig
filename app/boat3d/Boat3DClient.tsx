"use client";

import dynamic from "next/dynamic";

// WebGL과 localStorage를 쓰므로 SSR 비활성화
const BoatApp3D = dynamic(() => import("@/components/boat3d/BoatApp3D"), { ssr: false });

export default function Boat3DClient() {
  return <BoatApp3D />;
}
