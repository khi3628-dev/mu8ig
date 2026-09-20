# 체형별 착장 시뮬레이터 — 인수인계

마지막 갱신: 2026-09-20 / 커밋 `e64c446`

## 1. 현재 상태

| 항목 | 상태 |
|---|---|
| 브랜치 | `claude/body-type-clothing-simulator-y9y4hw` (원격에 푸시됨) |
| PR | **없음** — 아직 열지 않았다 |
| main 병합 | **안 됨** — main보다 커밋 1개 앞서 있다 |
| 프로덕션 반영 | 안 됨. 병합해야 `/body-type-simulator/` 로 노출된다 |

기능은 완성 상태다. 상의 4종 × 하의 5종, 체형 5종 판별, 키·어깨·가슴·허리·엉덩이
슬라이더가 모두 동작하고 헤드리스 브라우저로 렌더 검증까지 마쳤다.

## 2. 파일

```
public/body-type-simulator/
  index.html   레이아웃 + 빈 SVG 그룹 + 슬라이더. 옷 목록은 JS가 채운다
  style.css    토큰(:root) + 레이아웃. SVG 색은 .skin / .top / .bottom 클래스
  app.js       지오메트리·옷 정의·체형 판별·렌더 전부
```

Next.js 빌드에 포함되지 않는 순수 정적 파일이다. `public/` 아래라 그대로 서빙되고,
파일을 브라우저에 드래그해도 동작한다. 앱 코드와 의존성이 전혀 없다.

## 3. 핵심 설계 — 여기만 이해하면 된다

**몸과 옷이 같은 `y좌표 → 반너비` 함수를 공유한다.**

```js
bodyW(p, y)   // 목→어깨→가슴→허리→엉덩이→사타구니를 선형 보간한 몸통 반너비
legW(p, y)    // 엉덩이→무릎→발목을 보간한 한쪽 다리 반너비
shell(topY, hemY, widthFn, centerFn)  // widthFn을 따라 좌우 대칭 외곽선 path 생성
```

옷은 이 함수에 **여유분(ease)을 더한 것**으로 정의한다.

```js
펜슬 스커트:  bodyW(p,y) + 3 - (y - 엉덩이) * 0.13   // 엉덩이를 따라가며 좁아짐
A라인 스커트: bodyW(p,y) + 3 + (y - 엉덩이) * 0.30   // 허리에서 퍼짐
오버핏 박시:  max(sw, bw, hw) + 8                    // 몸과 무관한 상수 = 체형을 덮음
```

그래서 엉덩이 슬라이더를 키우면 펜슬은 같이 커지고 A라인은 덜 커진다.
**옷을 고정 도형으로 그리면 체형을 바꿔도 변하지 않아 비교 자체가 성립하지 않는다.**
새 옷을 추가할 때 이 원칙을 깨지 말 것.

### 좌표계

viewBox `0 -20 200 440`, 중심선 `CX = 100`. 세로 랜드마크(`V`):

| 이름 | y | 이름 | y |
|---|---|---|---|
| headCy | 44 | hipY | 206 |
| neckY | 70 | crotchY | 224 |
| shoulderY | 82 | kneeY | 302 |
| bustY | 118 | ankleY | 384 |
| waistY | 162 | floorY | 400 |

viewBox 위쪽 여유 `-20`은 키 190cm에서 머리가 잘리지 않게 하려고 둔 것이다. 줄이지 말 것.
키는 `floorY`(발밑) 기준 세로 스케일 0.92~1.08로만 적용한다. 둘레는 그대로 두므로
키가 클수록 같은 치수가 더 말라 보인다 — 의도된 동작이다.

### 둘레(cm) → 화면 반너비(px)

```js
어깨 × 0.97   가슴 × 0.385   허리 × 0.385   엉덩이 × 0.40
```

기본 체형이 자연스럽게 보이도록 눈으로 맞춘 계수다. 해부학적 근거는 없다.

## 4. 옷 추가하는 법

`TOPS` / `BOTTOMS` 배열에 객체 하나를 더하면 라디오 버튼까지 자동 생성된다.

```js
{
  id: 'wrap', label: '랩 원피스',
  hemY: 280,                    // 상의는 sleeveEase / sleeveEnd 도 필요
  width: (p, y) => bodyW(p, y) + 3,
  note: '한 줄 설명. UI 하단에 그대로 표시된다',
  good: ['모래시계', '사각형'],  // 어울림 배지 '잘 어울림'
  care: ['원형'],                // '주의'. 둘 다 아니면 '무난'
}
```

하의는 `kind: 'pants' | 'skirt'` 가 필수다. `pants` 는 엉덩이 블록 + 다리 두 짝으로,
`skirt` 는 단일 shell로 그려진다. `pants` 의 `width` 는 `legW` 기준, `skirt` 는 `bodyW` 기준이다.

그리는 순서(겹침 순서)는 `render()` 안에서 고정돼 있다:

```
피부(발·다리·몸통) → 하의 → 상의 몸판 → 팔 → 소매 → 머리
```

팔이 하의·상의보다 뒤에 오는 이유는 엉덩이가 넓은 체형에서 팔이 옷에 파묻히지 않게 하기 위해서다.

## 5. 검증 방법

이 환경에는 Playwright가 없다. 미리 설치된 크로미움을 직접 쓴다.

```bash
CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
"$CHROME" --no-sandbox --disable-gpu --hide-scrollbars \
  --screenshot=out.png --window-size=1000,860 --virtual-time-budget=3000 \
  "file:///경로/index.html"
```

`dbus` 연결 실패 로그가 잔뜩 나오지만 무해하다. 스크린샷은 정상 생성된다.

특정 조합을 찍으려면 `index.html` 사본의 `</body>` 앞에 스크립트를 주입한다.
`PRESETS`, `render()` 가 전역이라 바로 호출된다.

```html
<script>
window.addEventListener('load', () => {
  for (const [k,v] of Object.entries(PRESETS['triangle'])) document.getElementById(k).value = v;
  document.getElementById('height').value = 158;
  document.querySelector('input[name=top][value=crop]').checked = true;
  document.querySelector('input[name=bottom][value=pencil]').checked = true;
  render();
  // viewBox 이탈 검사
  const b = document.getElementById('scaler').getBBox();
  console.log(b.x, b.x + b.width, b.y, b.y + b.height);
});
</script>
```

**지오메트리를 건드렸다면 반드시 극단값 두 개를 확인할 것.**
최소(34/76/58/82·150cm)와 최대(48/112/104/118·190cm)에서 bbox가
`x 0~200`, `y -20~420` 안에 들어와야 한다. 마지막 측정값은
`x 24.9~175.1`, `y 27.0~397.5` 였다.

## 6. 이미 밟은 지뢰 — 되돌리지 말 것

1차 렌더에서 네 가지가 깨졌고, 고친 방식에 이유가 있다.

| 증상 | 원인 | 고친 방식 |
|---|---|---|
| 모든 상의가 오프숄더로 보임 | 어깨 경사 랜드마크 없음 | `bodyW` 에 `neckY+6` 중간점 추가, `topWidthAt()` 이 어깨 위쪽에서 옷 폭을 목선으로 클램프 |
| 오버핏에서 팔이 통째로 사라짐 | 소매가 몸판보다 안쪽 | `sleeveAxis` 를 몸판 폭 기준으로 계산 |
| 맨팔이 소매 옆으로 삐져나옴 | 소매 두께가 절대값(`9 + ease`) | 두께를 `sleeveAxis - axis + ARM.top + 1` 로 **역산**해 안쪽 경계가 항상 팔보다 안쪽이 되게 함 |
| 키 190에서 머리 잘림 | viewBox 부족 | `0 -20 200 440` 으로 확장 |

특히 세 번째. 소매 두께를 다시 상수로 바꾸면 오버핏에서 즉시 재발한다.

## 7. 남은 할 일

- [ ] PR 열지 / main 병합할지 결정 (사용자 판단 대기 중)
- [ ] 원피스 카테고리 — 현재 상의·하의 2분할 구조라 세 번째 그룹 추가 필요
- [ ] 옷 색상 변경 (CSS 변수 `--cloth-top` / `--cloth-bottom` 만 바꾸면 되므로 쉬움)
- [ ] 앞/옆모습 전환 — 옆모습은 너비 함수 전체를 새로 써야 해서 작업량이 크다

## 8. 확인 필요

- **lint**: `node_modules` 가 없어 `npm run lint` 를 돌려보지 못했다. `package.json` 의
  lint는 인자 없는 `eslint` 라 flat config 기준으로 `public/` 까지 검사 대상이 될 수 있다.
  CI에 lint 워크플로우가 없어 배포는 안 깨지지만, 로컬에서 걸리면
  `eslint.config.mjs` 의 `globalIgnores` 에 `public/**` 추가가 필요할 수 있다.
  기존 설정이라 임의로 건드리지 않았다.
- **Vercel 프리뷰**: 브랜치 푸시만으로 프리뷰가 뜨는지는 프로젝트 설정에 달려 있어 확인하지 못했다.

## 9. 범위 밖이라고 명시해 둔 것

어울림 배지(`good` / `care`)는 일반적인 스타일링 통념을 단순화한 규칙이고 근거 데이터가 없다.
페이지 하단에 참고용이라고 고지해 두었다. 이걸 정밀한 추천으로 확장하려면
규칙 테이블이 아니라 실제 착용 데이터가 필요하다.
