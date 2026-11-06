import { gameMetadata, gameViewport } from "@/lib/boat/site";
import Boat3DClient from "./Boat3DClient";

export const metadata = gameMetadata("요트 파라다이스 레이싱 3D", "/boat3d");
export const viewport = gameViewport;

export default function Boat3DPage() {
  return <Boat3DClient />;
}
