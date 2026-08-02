import { NextResponse } from "next/server";
import { getComplexes } from "@/lib/naver-land";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 관심 단지 등록 화면의 단지 선택용 목록 */
export async function GET() {
  try {
    const complexes = await getComplexes();

    return NextResponse.json({
      total: complexes.length,
      complexes: complexes.map((complex) => ({
        complexNo: complex.complexNo,
        complexName: complex.complexName,
        address: complex.cortarAddress,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch complexes", error);
    return NextResponse.json(
      { error: "단지 목록을 불러오지 못했습니다." },
      { status: 502 }
    );
  }
}
