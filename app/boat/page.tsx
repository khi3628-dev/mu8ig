import type { Metadata } from "next";
import BoatClient from "./BoatClient";

export const metadata: Metadata = {
  title: "요트 파라다이스 레이싱",
};

export default function BoatPage() {
  return <BoatClient />;
}
