"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";

const RECIPIENT_EMAIL = "hi0412.kim@samsung.com";
const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;

type UploadedFile = {
  file: File;
  preview: string;
};

type SubmitStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export default function SafetyLandingPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<SubmitStatus>({ state: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const valid: UploadedFile[] = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setStatus({
          state: "error",
          message: `${file.name} 파일이 ${MAX_FILE_SIZE_MB}MB 제한을 초과했습니다.`,
        });
        continue;
      }
      valid.push({ file, preview: URL.createObjectURL(file) });
    }

    setFiles((prev) => {
      const next = [...prev, ...valid].slice(0, MAX_FILES);
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setStatus({ state: "error", message: "사진을 1장 이상 첨부해주세요." });
      return;
    }
    if (!description.trim()) {
      setStatus({ state: "error", message: "위험 상황 설명을 입력해주세요." });
      return;
    }

    setStatus({ state: "submitting" });

    try {
      const form = new FormData();
      form.append("recipient", RECIPIENT_EMAIL);
      form.append("reporterName", reporterName);
      form.append("reporterEmail", reporterEmail);
      form.append("location", location);
      form.append("severity", severity);
      form.append("description", description);
      files.forEach((f) => form.append("photos", f.file));

      const res = await fetch("/api/safety-report", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "제출에 실패했습니다.");
      }

      setStatus({
        state: "success",
        message: `안전 제보가 ${RECIPIENT_EMAIL} 으로 접수되었습니다. (접수번호: ${data.reportId})`,
      });
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setReporterName("");
      setReporterEmail("");
      setLocation("");
      setDescription("");
      setSeverity("medium");
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.",
      });
    }
  };

  const severityStyles = {
    low: "bg-emerald-100 text-emerald-700 border-emerald-300",
    medium: "bg-amber-100 text-amber-700 border-amber-300",
    high: "bg-red-100 text-red-700 border-red-300",
  } as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
            !
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Safety 제보 센터
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              현장의 안전 위험 요소를 사진과 함께 알려주세요.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <section className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-5 mb-8">
          <h2 className="font-semibold text-red-800 dark:text-red-300 mb-1">
            여러분의 한 장의 사진이 사고를 막을 수 있습니다
          </h2>
          <p className="text-sm text-red-700/80 dark:text-red-200/80">
            위험 요소를 발견하시면 사진을 첨부해 즉시 제보해 주세요. 모든 제보는{" "}
            <span className="font-mono font-semibold">{RECIPIENT_EMAIL}</span>{" "}
            안전 담당자에게 전달됩니다.
          </p>
        </section>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              사진 첨부 <span className="text-red-500">*</span>
              <span className="text-xs text-slate-400 ml-2">
                최대 {MAX_FILES}장 / 파일당 {MAX_FILE_SIZE_MB}MB
              </span>
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition"
            >
              <p className="text-sm text-slate-600 dark:text-slate-300">
                여기를 클릭하여 사진을 선택하거나 카메라로 촬영하세요
              </p>
              <p className="text-xs text-slate-400 mt-1">
                JPG, PNG, HEIC 등 이미지 파일
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition"
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                제보자 이름
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="홍길동 (선택)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                회신 이메일
              </label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="you@samsung.com (선택)"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              발생 위치
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 본관 3층 복도, 화성 캠퍼스 P2동 옥상"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              위험 등급
            </label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    severity === s
                      ? severityStyles[s]
                      : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {s === "low" && "낮음"}
                  {s === "medium" && "보통"}
                  {s === "high" && "긴급"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              위험 상황 설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="발견한 위험 요소, 시간, 상황 등을 구체적으로 기술해 주세요."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          {status.state === "error" && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-300">{status.message}</p>
            </div>
          )}
          {status.state === "success" && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg px-4 py-3">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {status.message}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={status.state === "submitting"}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              {status.state === "submitting"
                ? "제출 중..."
                : `${RECIPIENT_EMAIL} 으로 제보 전송`}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            긴급한 사고는 먼저 119 또는 사내 안전상황실(내선 119)에 즉시 신고해주세요.
          </p>
        </form>
      </main>

      <footer className="max-w-3xl mx-auto px-6 py-8 text-center text-xs text-slate-400">
        © Safety Reporting Portal · 모든 제보는 안전 담당자에게 전달됩니다.
      </footer>
    </div>
  );
}
