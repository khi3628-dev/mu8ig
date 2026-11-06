import { gameMetadata, gameViewport } from "@/lib/boat/site";
import BoatClient from "./BoatClient";

export const metadata = gameMetadata("요트 파라다이스 레이싱", "/boat");
export const viewport = gameViewport;

export default function BoatPage() {
  return <BoatClient />;
}
