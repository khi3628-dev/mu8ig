"use client";

import BoatApp from "@/components/boat/BoatApp";
import type { BoardProps } from "@/components/boat/ParadiseView";
import ParadiseBoard3D from "./ParadiseBoard3D";
import RaceView3D from "./RaceView3D";

const renderBoard = (props: BoardProps) => <ParadiseBoard3D {...props} />;

// 2D 버전과 같은 저장 데이터·규칙을 쓰고 화면만 3D로 바꿔 끼운다
export default function BoatApp3D() {
  return <BoatApp Race={RaceView3D} board={renderBoard} />;
}
