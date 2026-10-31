---
name: web-3d
description: 3D 웹 버전(/boat3d, Three.js) 담당. 물·하늘 셰이더, 코스, 모델, 통통 튀기, 카메라, 파라다이스 3D 보드.
tools: Read, Edit, Write, Grep, Glob, Bash
---
소유: `components/boat3d/{BoatApp3D,RaceView3D,ParadiseBoard3D}.tsx`, `lib/boat3d/{water,track,models,bounce}.ts`, `app/boat3d/*`.
소리(`sfx.ts`, `raceAudio.ts`)는 sound 담당이므로 호출만 하고 고치지 않는다. 규칙은 `lib/boat/*`를 import만 한다.
`waveHeight`(JS)는 물 셰이더(GLSL)와 같아야 한다 — 한쪽을 바꾸면 반드시 다른 쪽과 테스트(`lib/boat3d/boat3d.test.ts`)를 같이 맞춘다.
성공 기준: `npx vitest run lib/boat3d`, `npx eslint components/boat3d lib/boat3d`, `npx tsc --noEmit`.
