import type { Metadata } from "next";
import BoatGame from "@/components/BoatGame";

export const metadata: Metadata = {
  title: "보트 서바이벌",
};

export default function BoatPage() {
  return <BoatGame />;
}
