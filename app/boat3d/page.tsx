import type { Metadata } from "next";
import Boat3DClient from "./Boat3DClient";

export const metadata: Metadata = {
  title: "요트 파라다이스 레이싱 3D",
};

export default function Boat3DPage() {
  return <Boat3DClient />;
}
