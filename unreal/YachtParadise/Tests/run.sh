#!/usr/bin/env bash
# 게임 규칙 코어를 언리얼 없이 컴파일하고 테스트한다.
# 웹 버전과의 동일성 기준값은 parity/generate.ts로 다시 만들 수 있다.
set -euo pipefail
cd "$(dirname "$0")"
CORE=../Source/YachtParadise/Core
OUT="${TMPDIR:-/tmp}/yp-coretests"
${CXX:-g++} -std=c++17 -O1 -Wall -Wextra -Wshadow -Werror -fno-exceptions -fno-rtti \
  -I"$CORE" "$CORE"/YPRace.cpp "$CORE"/YPParadise.cpp "$CORE"/YPFx.cpp "$CORE"/YPSynth.cpp CoreTests.cpp -o "$OUT"
"$OUT" parity/expected.txt "$@"
