# 요트 파라다이스 레이싱 — 이미지 생성 프롬프트 10장

이미 있는 이미지(`public/boat/`): title(경주 장면), podium(우승 시상대), ski(제트스키 대표 컷), marlin(황금 청새치), avatar(얼굴).
아래 10장은 **아직 없는 화면**을 채우는 용도입니다. 결과 파일은 `public/boat/<파일명>.webp`로 저장하면 됩니다.

## 우선 6장 (지금 게임에 바로 쓸 곳이 있는 것)

공통 규칙(주인공 고정 문구 + 공통 스타일)은 아래와 같이 그대로 붙입니다. 1·2·3·6은 아래 10장 목록과 같은 장면을 다듬은 것이고, 4·5는 새 기능(범퍼카 충돌, 1인칭) 컷입니다.

| # | 파일명 | 쓸 곳 | 비율 |
|---|---|---|---|
| 1 | result-lose | 결과 화면 4~6위 (지금은 ski 이미지로 대신) | 16:9 |
| 2 | paradise-bg | 섬 건설 화면 배경 | 16:9 |
| 3 | race-start | 레이스 출발 카운트다운 | 16:9 |
| 4 | bump | 범퍼카 충돌 소개 컷 | 16:9 |
| 5 | first-person | 1인칭 시점 안내 | 16:9 |
| 6 | rivals | 라이벌 5명 소개 | 16:9 |

1. result-lose
> The protagonist sitting on the jet ski drifting slowly just after the finish gate, helmet visor raised, catching breath and looking toward a distant podium where a rival in a red suit celebrates, golden late-afternoon light, calm water, determined rather than sad expression, wide banner composition with the subject in the center third

2. paradise-bg
> Soft aerial three-quarter view of a private tropical island lagoon at midday, white sand, a few palm trees, a wooden dock with the white-and-gold jet ski parked, calm turquoise shallow water, lots of open sand and water in the center left empty for game UI, gentle depth of field, airy and bright

3. race-start
> Low wide-angle shot at water level of six stand-up jet skis lined up side by side at a floating start line, the protagonist in the center, rivals in red, orange, green, purple and sky-blue racing suits, tall orange gate with a black-and-white checkered banner overhead, three red start lights glowing, engines idling with small foam around the hulls, tension before the start

4. bump
> Playful side-by-side collision between the protagonist's white-and-gold jet ski and a rival's red jet ski, both hulls bouncing apart like bumper cars, a burst of white spray at the point of contact, both riders leaning away with surprised but fun expressions, frozen water droplets, sunny turquoise sea, dynamic three-quarter angle

5. first-person
> First-person view from the rider's eyes on a speeding stand-up jet ski, white-and-gold handlebars and gloved hands with gold stripes in the lower frame, the pointed white nose of the jet ski cutting through turquoise water, orange checkpoint gate and red-and-white buoys ahead, a rival jet ski slightly ahead on the right, motion blur and spray, horizon slightly tilted into a turn

6. rivals
> Group lineup of five jet ski racers standing confidently on a luxury marina dock beside their jet skis, each in a fitted racing suit of a single color: red, orange, green, purple, sky blue, helmets held under the arm, diverse adult men and women, varied confident poses, superyachts in the background, equal spacing like a character-select screen

---

## 공통 규칙 (모든 프롬프트 뒤에 붙이기)

캐릭터 고정 문구 — 주인공이 나오는 컷에 그대로 넣으세요:
> the same protagonist: a sleek racer in a fitted glossy white wetsuit-style racing suit with thin metallic gold piping lines along the arms, sides and legs, white helmet with a gold visor stripe, riding a low sleek white-and-gold stand-up jet ski with a pointed hull

공통 스타일:
> premium mobile racing game key art, cinematic photoreal 3D render, turquoise tropical sea, bright midday sun, crisp specular highlights on water, luxury yacht-club mood, clean composition with empty space for UI, no text, no logos, no watermark

라이벌 5명의 슈트 색: 마르코 빨강(#ef4444), 소피아 주황(#f97316), 레오 초록(#22c55e), 아이라 보라(#a855f7), 카이 하늘(#0ea5e9).

---

### 1. start-grid — 출발선 (레이스 시작·로딩 화면) · 16:9
> Low wide-angle shot at water level of six stand-up jet skis lined up side by side at a floating start line on a turquoise sea, the protagonist in the center (white suit with gold lines), rivals on both sides in red, orange, green, purple and sky-blue racing suits, a tall orange gate with a black-and-white checkered banner overhead, five red start lights glowing on the gate, engines idling with small foam around the hulls, tension before the start

### 2. defeat — 아쉬운 결과 (2~6위 결과 화면) · 16:9
> The protagonist sitting on the jet ski drifting slowly just after the finish gate, helmet visor raised, catching breath and looking toward a distant podium where a rival in a red suit celebrates, golden late-afternoon light, calm water, determined rather than sad expression, motivating "next time" mood

### 3. ghost — 고스트 레이서 (최고 기록과 대결) · 16:9
> The protagonist racing at high speed side by side with a translucent glowing cyan ghost copy of themselves on an identical jet ski, the ghost semi-transparent with a soft light trail, motion blur on the sea spray, chase-camera angle from behind and slightly above, sense of racing against your own best time

### 4. rivals — 라이벌 5명 소개 · 16:9
> Group lineup of five jet ski racers standing confidently on a luxury marina dock beside their jet skis, each in a fitted racing suit of a single color: red, orange, green, purple, sky blue, helmets held under the arm, diverse adult men and women, varied confident poses, superyachts moored in the background, character-select screen composition with equal spacing

### 5. paradise-hero — 완성된 요트 파라다이스 (파라다이스 화면 배경) · 16:9
> Aerial three-quarter view of a small private tropical island fully developed into a luxury paradise: white modern villa, infinity pool, beach bar with umbrellas, sun loungers, palm trees, a white lighthouse on the point, wooden docks with a sailing yacht and a large white-and-gold superyacht moored, shallow turquoise lagoon around white sand, a white-and-gold jet ski parked at the dock

### 6. island-start — 처음 섬 (파라다이스 시작 상태) · 16:9
> Aerial three-quarter view of a tiny empty sandy islet with only two palm trees and a single short wooden dock, the white-and-gold jet ski parked at the dock, vast turquoise lagoon around, lots of empty sand ready to be built on, hopeful beginning mood, same camera angle and lighting as a "fully developed island" companion image

### 7. garage — 업그레이드 정비소 (엔진·핸들링·그물) · 16:9
> Stylish open-air marina workshop at a luxury harbor, the white-and-gold jet ski on a stand with its engine cover open showing a polished high-performance engine, tools neatly arranged, a coiled fishing net with gold floats hanging on the wall, the protagonist in the white suit with gold lines leaning on the workbench, warm tropical light through slatted wooden roof

### 8. catch-tuna — 참치를 낚는 순간 (낚시 배너) · 4:3
> Dynamic close-up of the protagonist leaning off the speeding jet ski and scooping a big silver-blue bluefin tuna out of the water with a gold-rimmed net, water droplets frozen in the air, splash backlit by the sun, exciting catch moment, same framing style as a golden marlin catch shot

### 9. superyacht-reward — 슈퍼요트 획득 (가장 비싼 시설 구매 연출) · 16:9
> A huge white superyacht with gold trim lines and dark tinted windows arriving at a private island dock at sunset, the protagonist standing on the dock in the white suit with gold lines watching it arrive, warm orange-pink sky reflected on calm water, sense of achievement and luxury

### 10. app-icon — 게임 아이콘 · 1:1
> Bold game app icon: the protagonist on the white-and-gold jet ski bursting diagonally out of a turquoise wave toward the viewer, big white spray, gold accents catching the sun, simple saturated background gradient from turquoise to deep blue, centered subject readable at small size, rounded-square framing, no text

---

## 생성 후 확인할 것
- 주인공 슈트가 **흰색 + 금색 선**인지, 헬멧이 있는지 (컷마다 달라지기 쉬움)
- 5·6번은 같은 카메라 각도여야 섬이 "성장"하는 것처럼 보임
- 얼굴·손가락·제트스키 형태가 깨지지 않았는지
- 게임에 넣을 때는 webp로 변환하고 `lib/boat/art.ts`에 경로를 추가 (art-assets 에이전트 담당)
