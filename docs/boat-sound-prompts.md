# 요트 파라다이스 레이싱 — 사운드 프롬프트 목록

텍스트→오디오 모델(예: AudioGen medium)로 효과음을 만들기 위한 목록입니다.
지금 게임은 브라우저에서 합성한 소리를 쓰고, 아래 파일이 있으면 자동으로 그 파일로 바꿔 씁니다.

## 적용 방법

1. 아래 프롬프트로 소리를 만들어 **파일명 그대로** 저장합니다 (`.wav` 또는 `.mp3`).
2. 파일을 `public/boat/sfx/`에 넣습니다.
3. `public/boat/sfx/manifest.json`에 넣은 파일명을 적습니다.
   ```json
   ["engine_idle.wav", "engine_high.wav", "splash_land.wav"]
   ```
4. 목록에 없는 소리는 계속 합성음으로 납니다. 일부만 바꿔도 됩니다.

## 공통 원칙 (유치하지 않게)

- 모든 프롬프트 끝에 **`no music, no voice`**를 붙입니다. 배경음악이나 사람 목소리가 섞이면 쓸 수 없습니다.
- **실제 녹음 같은 소리**를 노립니다. "cartoon", "game", "8-bit", "cute" 같은 단어는 쓰지 않습니다.
- 반복(loop) 소리는 시작과 끝 음량이 비슷하도록 **일정하게 지속되는 소리**를 요청합니다. 어택이나 페이드가 없어야 이음새가 안 들립니다.
- 같은 프롬프트로 3~4개를 만들어 가장 깨끗한 것을 고르는 걸 권합니다. 생성 결과는 매번 다릅니다.
- 설정값(길이, temperature, cfg 등)은 사용하는 화면에 따라 이름이 다를 수 있습니다. 아래 길이만 맞추면 됩니다.

## 1. 계속 울리는 소리 (loop)

게임이 속도에 맞춰 재생 속도와 음량을 바꿔 가며 반복 재생합니다.

| 파일명 | 길이 | 프롬프트 | 메모 |
|---|---|---|---|
| `engine_idle` | 4초 | `personal watercraft jet ski engine idling on calm water, three-cylinder four-stroke, steady low rumble with slight exhaust burble, close microphone, constant, no music, no voice` | 저속·정지. 일정한 소리여야 함 |
| `engine_high` | 4초 | `jet ski engine at full throttle, high rpm roar with jet pump whine, steady and constant, recorded close behind the rider, no music, no voice` | 고속. idle과 섞어서 씀 |
| `water_rush` | 5초 | `fast boat hull cutting through choppy ocean water at high speed, continuous water rush and spray hiss, no engine, no music, no voice` | 엔진 소리가 섞이면 안 됨 |
| `wind` | 5초 | `strong wind rushing past an open-air rider at high speed on the sea, steady, no music, no voice` | 고속에서만 들림 |

## 2. 착수·물보라

| 파일명 | 길이 | 프롬프트 | 메모 |
|---|---|---|---|
| `splash_land` | 1.5초 | `jet ski hull slamming hard onto ocean water after a jump, heavy low thud and big splash with spray falling, no music, no voice` | 크게 튀었다 떨어질 때 |
| `splash_small` | 1초 | `small boat hull slapping a wave at speed, short light splash, no music, no voice` | 잔 튐 |
| `rev_air` | 1초 | `jet ski engine over-revving sharply as the impeller leaves the water, short high rpm scream, no music, no voice` | 공중에 뜬 순간 |

## 3. 레이스 진행

| 파일명 | 길이 | 프롬프트 | 메모 |
|---|---|---|---|
| `countdown` | 0.5초 | `single short race start beep, clean sine electronic tone, outdoor stadium PA, no music, no voice` | 3·2·1 |
| `go` | 1초 | `race start tone, one longer higher clean beep, outdoor stadium PA, no music, no voice` | GO |
| `boost` | 1.5초 | `jet ski engine revving up hard with a rising turbo whoosh and a burst of water spray, no music, no voice` | 파도 부스트 |
| `checkpoint` | 0.4초 | `subtle short electronic tick, modern racing dashboard notification, clean, no music, no voice` | 게이트 통과. 작고 짧게 |
| `lap` | 0.8초 | `two-tone modern electronic notification, sleek racing dashboard lap complete, short, no music, no voice` | 바퀴 완료 |
| `finish_horn` | 2.5초 | `loud marine air horn blast from a yacht, deep and long, outdoor harbor, no music, no voice` | 완주 |
| `crowd` | 4초 | `crowd cheering and applauding at a seaside race finish line, distant, outdoor, no music` | 완주 뒤에 겹침 |
| `rival_passby` | 3초 | `jet ski passing by close at high speed from left to right, engine roar with doppler effect, no music, no voice` | 라이벌 추월 |
| `gear_shift` | 0.5초 | `heavy mechanical gear lever clunk, metal latch click, short, no music, no voice` | 기어 D↔R |

## 4. 낚시

| 파일명 | 길이 | 프롬프트 | 메모 |
|---|---|---|---|
| `fish_catch` | 1.5초 | `fishing reel line zipping out fast then a fish splashing out of the water, no music, no voice` | 일반 물고기 |
| `fish_legend` | 2.5초 | `huge marlin leaping out of the ocean with a massive splash and heavy water impact, no music, no voice` | 황금 청새치 |
| `fish_miss` | 0.6초 | `small object dropping into water with a soft plop, no music, no voice` | 허탕 |

## 우선순위

모든 파일을 한 번에 만들 필요는 없습니다. 체감이 큰 순서는 다음과 같습니다.

1. `engine_idle`, `engine_high` — 레이스 내내 들리는 소리라 인상이 가장 크게 바뀝니다
2. `water_rush`, `splash_land`, `splash_small` — 통통 튀는 느낌과 직결됩니다
3. `finish_horn`, `crowd`, `boost`
4. 나머지
