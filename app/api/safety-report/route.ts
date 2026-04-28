import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const RECIPIENT_EMAIL = "hi0412.kim@samsung.com";
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "safety-reports");

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const reporterName = (form.get("reporterName") as string) || "익명";
    const reporterEmail = (form.get("reporterEmail") as string) || "";
    const location = (form.get("location") as string) || "";
    const severity = (form.get("severity") as string) || "medium";
    const description = (form.get("description") as string) || "";
    const photos = form.getAll("photos").filter((p): p is File => p instanceof File);

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "사진이 첨부되지 않았습니다." },
        { status: 400 }
      );
    }
    if (!description.trim()) {
      return NextResponse.json(
        { error: "위험 상황 설명이 필요합니다." },
        { status: 400 }
      );
    }

    const reportId = `SR-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const reportDir = path.join(UPLOAD_DIR, reportId);
    await mkdir(reportDir, { recursive: true });

    const savedFiles: string[] = [];
    for (const photo of photos) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(reportDir, safeName);
      await writeFile(filePath, buffer);
      savedFiles.push(safeName);
    }

    const metadata = {
      reportId,
      recipient: RECIPIENT_EMAIL,
      receivedAt: new Date().toISOString(),
      reporterName,
      reporterEmail,
      location,
      severity,
      description,
      photos: savedFiles,
    };
    await writeFile(
      path.join(reportDir, "metadata.json"),
      JSON.stringify(metadata, null, 2),
      "utf-8"
    );

    console.log(
      `[Safety Report] ${reportId} → ${RECIPIENT_EMAIL} | severity=${severity} | photos=${savedFiles.length}`
    );

    return NextResponse.json({
      ok: true,
      reportId,
      recipient: RECIPIENT_EMAIL,
      photoCount: savedFiles.length,
    });
  } catch (err) {
    console.error("[Safety Report] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 오류" },
      { status: 500 }
    );
  }
}
