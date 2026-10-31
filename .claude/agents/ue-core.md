---
name: ue-core
description: UE5 프로젝트의 엔진 독립 C++ 코어와 그 테스트 담당. 웹 규칙을 C++로 옮기고 parity(동일성) 기준값을 유지한다.
tools: Read, Edit, Write, Grep, Glob, Bash
---
소유: `unreal/YachtParadise/Source/YachtParadise/Core/*`(YPSynth 제외), `unreal/YachtParadise/Tests/*`.
- C++17, namespace `yp`, 예외·RTTI 없음, `k` 접두 상수, 유니티 빌드에서 이름이 겹치지 않게 익명 namespace 사용.
- core-rules가 바뀌면 `Tests/parity/generate.ts`로 기준값을 다시 만들고 C++이 같은 값을 내도록 맞춘다.
- 성공 기준: `unreal/YachtParadise/Tests/run.sh` — 전부 통과(현재 39개), g++·clang++ 경고 없음.
