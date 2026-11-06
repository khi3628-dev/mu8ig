// 포털(CrazyGames·Poki) 제출용 정적 빌드: 게임 전체를 index.html 한 파일로 묶는다.
// 이미지(webp)·음악(mp3)을 data URI로 넣어 외부 요청이 없고, 광고 플랫폼은 빌드 시점에 고정한다.
//
//   node scripts/build-portal.mjs crazygames   → dist-portal/crazygames/index.html + yacht-paradise-crazygames.zip
//   node scripts/build-portal.mjs poki
//   node scripts/build-portal.mjs none         → 광고 없는 판 (자체 배포·시연용)
//
// 결과 zip을 포털 개발자 포털에 그대로 올리면 된다 (docs/LAUNCH.md).
import * as esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const platform = process.argv[2] ?? "crazygames";
if (!["crazygames", "poki", "none"].includes(platform)) {
  console.error("platform must be crazygames | poki | none");
  process.exit(1);
}
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(repo, "dist-portal", platform);
fs.mkdirSync(out, { recursive: true });

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;

// lib/boat/art.ts의 "/boat/*.webp" → data URI
const inlineArt = {
  name: "inlineArt",
  setup(b) {
    b.onLoad({ filter: /lib\/boat\/art\.ts$/ }, (a) => ({
      contents: fs
        .readFileSync(a.path, "utf8")
        .replace(/"\/boat\/([a-z]+)\.webp"/g, (_, n) => `"${dataUri(`${repo}/public/boat/${n}.webp`, "image/webp")}"`),
      loader: "ts",
    }));
  },
};
// components/boat/music.ts의 mp3 → data URI
const inlineMusic = {
  name: "inlineMusic",
  setup(b) {
    b.onLoad({ filter: /components\/boat\/music\.ts$/ }, (a) => {
      const dir = `${repo}/public/boat/music`;
      const map = Object.fromEntries(
        fs.readdirSync(dir).filter((f) => f.endsWith(".mp3")).map((f) => [f.slice(0, -4), dataUri(`${dir}/${f}`, "audio/mpeg")]),
      );
      let src = fs.readFileSync(a.path, "utf8");
      src = `const __MUSIC: Record<string, string> = ${JSON.stringify(map)};\n` + src.replace('new Audio(DIR + track + ".mp3")', "new Audio(__MUSIC[track])");
      if (!src.includes("__MUSIC[track]")) throw new Error("music.ts 패턴이 바뀜 — 이 스크립트를 같이 고칠 것");
      return { contents: src, loader: "ts" };
    });
  },
};

const entry = `import { createRoot } from "react-dom/client";
import BoatApp3D from "@/components/boat3d/BoatApp3D";
createRoot(document.getElementById("root")!).render(<BoatApp3D />);`;
fs.writeFileSync(path.join(out, "entry.tsx"), entry);

const js = await esbuild.build({
  entryPoints: [path.join(out, "entry.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  plugins: [inlineArt, inlineMusic],
  alias: { "@": repo },
  target: "es2020",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_GAME_PLATFORM": JSON.stringify(platform),
  },
  absWorkingDir: repo,
  nodePaths: [path.join(repo, "node_modules")],
});

const cssInput = `@import "tailwindcss" source(none);\n@source "${repo}/components/boat";\n@source "${repo}/components/boat3d";`;
const css = await postcss([tailwind({ base: repo, optimize: { minify: true } })]).process(cssInput, { from: path.join(repo, "play.css") });

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Yacht Paradise Racing</title>
<style>
:root { --sea: #0369a1; color-scheme: dark; }
html, body, #root { height: 100%; margin: 0; }
body { background: var(--sea); color: #fff; font-family: system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; overflow: hidden; }
#root .h-screen { height: 100%; }
</style>
<style>${css.css}</style>
</head>
<body>
<div id="root"></div>
<script>${js.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(out, "index.html"), html);
fs.rmSync(path.join(out, "entry.tsx"));

const zip = path.join(repo, "dist-portal", `yacht-paradise-${platform}.zip`);
fs.rmSync(zip, { force: true });
execFileSync("python3", ["-c", `
import zipfile, sys
with zipfile.ZipFile(sys.argv[1], "w", zipfile.ZIP_DEFLATED) as z:
    z.write(sys.argv[2], "index.html")
`, zip, path.join(out, "index.html")]);
console.log(`${platform}: index.html ${(html.length / 1e6).toFixed(2)}MB → ${zip}`);
