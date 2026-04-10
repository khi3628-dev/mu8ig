import { NextRequest, NextResponse } from "next/server";
import { exportToObsidian } from "@/lib/obsidian-exporter";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vaultPath,
      listings,
      scrapedAt,
      tradeType,
    }: {
      vaultPath: string;
      listings: Listing[];
      scrapedAt: string;
      tradeType: string;
    } = body;

    if (!vaultPath || !vaultPath.trim()) {
      return NextResponse.json(
        { error: "Obsidian 볼트 경로를 입력해주세요." },
        { status: 400 }
      );
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json(
        { error: "저장할 매물 데이터가 없습니다." },
        { status: 400 }
      );
    }

    const result = await exportToObsidian(
      vaultPath,
      listings,
      scrapedAt,
      tradeType
    );

    return NextResponse.json({
      success: true,
      message: `Obsidian 볼트에 ${result.totalFiles}개 파일이 저장되었습니다.`,
      ...result,
    });
  } catch (error) {
    console.error("Export failed:", error);
    const message =
      error instanceof Error ? error.message : "파일 저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
