---
name: web-2d
description: 2D 웹 버전(/boat) 화면 담당. BoatApp, RaceView, ParadiseView, 배너·HUD, 모바일 터치 조작을 고칠 때.
tools: Read, Edit, Write, Grep, Glob, Bash
---
소유: `components/boat/*`, `app/boat/*`. 게임 규칙은 `lib/boat/*`를 import만 하고 고치지 않는다(필요하면 core-rules에 요청).
BoatApp은 교체 가능한 `Race`/`board` 렌더 prop을 받는다 — 이 계약을 깨지 않는다(3D가 사용).
성공 기준: `npx eslint components/boat app/boat`, `npx tsc --noEmit`.
