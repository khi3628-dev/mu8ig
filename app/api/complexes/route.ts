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

    // 원인을 그대로 내려준다. 네이버가 데이터센터 IP를 막는 등의 실패는
    // 메시지를 감추면 배포 환경에서 진단할 방법이 없다.
    // 여기 담기는 건 상류 HTTP 상태뿐이고 자격증명은 들어가지 않는다.
    const detail = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: `단지 목록을 불러오지 못했습니다. (${detail})` },
      { status: 502 }
    );
  }
}
