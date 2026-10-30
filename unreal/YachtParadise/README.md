# 요트 파라다이스 레이싱 — 언리얼 엔진 5 버전

웹 버전(`/boat3d`)을 언리얼 엔진 5 C++ 프로젝트로 옮긴 것입니다.
흰 슈트 제트스키 레이스(AI 5명, 3바퀴, 3분), 레이스 중 낚시, 요트 파라다이스 건설, 고스트 레이서, 시설 효과, 기어 D/R, 통통 튀는 주행, 합성 사운드까지 같은 규칙으로 동작합니다.

**별도 에셋 없이 실행되도록** 만들었습니다. 맵·메시·재질·사운드·UI 에셋을 만들지 않아도, 엔진 기본 도형과 기본 재질만으로 하늘·바다·코스·제트스키·섬을 실행 중에 조립합니다.

## 열고 실행하기

준비물
- 언리얼 엔진 **5.4 이상** (에픽게임즈 런처)
- Windows: Visual Studio 2022 + "C++를 사용한 게임 개발" 워크로드 / macOS: Xcode

순서
1. `YachtParadise.uproject`를 마우스 오른쪽 클릭 → **Generate Visual Studio project files** (macOS는 Generate Xcode project)
2. 만들어진 `YachtParadise.sln`을 열고 `Development Editor` 구성으로 빌드
   (또는 `.uproject`를 더블클릭하면 "모듈을 다시 빌드할까요?"에서 예)
3. 에디터가 열리면 **Play**. 시작 맵은 엔진 기본 `/Engine/Maps/Entry`이고, 게임 모드 `YPGameMode`가 모든 것을 만듭니다.
   - 만약 Entry 맵이 없다는 오류가 나면: 빈 레벨을 하나 만들고 **World Settings → GameMode Override = YPGameMode**로 지정한 뒤 실행하세요.

## 조작

| 화면 | 키 |
|---|---|
| 타이틀 | Enter 시작 |
| 파라다이스 | 마우스 클릭 = 건설, 1~9 시설 선택, R 섬 확장, X 팔기, U/I/O 업그레이드(엔진·핸들링·그물), Enter = 레이스 출전 |
| 레이스 | W/S 가속·감속, A/D 조향, Q 기어 D↔R, Space/F 낚시, M 소리 |
| 결과 | Enter = 파라다이스로 |

진행 상황은 UE SaveGame 슬롯 `YachtParadise`에 자동 저장됩니다.

## 구조

```
Source/YachtParadise/
  Core/                  엔진 독립 C++17 — 게임 규칙 전부 (웹 버전 lib/boat/*.ts를 그대로 옮김)
    YPCore.h             레이스·고스트·파라다이스·파도·튀기·효과음 이벤트 API
    YPRace.cpp           레이스 규칙: AI 접전 보정·추월, 충돌, 낚시, 부스트, 체크포인트, 고스트 기록
    YPParadise.cpp       건설·섬 확장·판매·업그레이드·시설 효과·보상
    YPFx.cpp             파도 높이, 통통 튀기, 효과음 이벤트
    YPSynth.h/.cpp       사운드 합성기 (엔진 RPM 배음·물살·라이벌 도플러·효과음, 소리 파일 없음)
  Public/ Private/       언리얼 계층 — 코어를 매 프레임 돌리고 보여주기만 한다
    YPGameMode           단계 전환(타이틀→파라다이스→레이스→결과), 카메라 추적, 소리, 저장
    YPPlayerController   키보드·마우스 입력 (입력 에셋 불필요)
    YPHUD                캔버스 HUD: P순위/LAP/TIME/BEST, 속도계, 출발 신호등, 구간 비교, 결과판, 파라다이스 메뉴
    YPJetSki             제트스키+라이더 (기본 도형 조립), 물고기
    YPCourse             바다, 게이트, 경계 부표 111개, 부스트 패드, 빛기둥, 먼 섬·슈퍼요트
    YPParadise           10×8 섬 격자와 시설 9종 모델, 클릭 판정
    YPRaceSynthComponent USynthComponent로 코어 합성기를 오디오 스레드에서 재생
    YPSaveGame           USaveGame ↔ 코어 저장 데이터
Tests/
  CoreTests.cpp          코어 테스트 (언리얼 없이 g++/clang++로 실행)
  run.sh                 빌드+실행 (./run.sh --wav out.wav 로 사운드 미리듣기 생성)
  parity/                웹 버전과 C++ 이식본의 동일성 기준값 (generate.ts로 다시 생성)
```

## 무엇을 확인했고, 무엇을 못 했는가

확인함 (언리얼 없이 이 저장소에서)
- **게임 규칙 코어 테스트 39개 통과** — g++·clang++ 둘 다, 예외·RTTI 끄고 경고를 오류로 (`Tests/run.sh`)
- **웹 버전과 동일**: 같은 난수·입력으로 TypeScript 원본과 C++ 이식본을 레이스 끝까지 돌려 중간 기록 21줄과 최종 결과 2줄(순위·시간·상금·낚시·충돌·고스트 기록 수)이 모두 일치
- **사운드 합성기**: 엔진 기본 주파수가 공회전 32.5Hz(1,300rpm), 최고속 195Hz(7,800rpm), 공중에 뜨면 230Hz 이상. 효과음이 공회전 대비 순간 음량 2배 이상. NaN·소리 깨짐 없음
- **언리얼 계층 C++ 문법·타입 검사**: 사용한 UE API를 흉내 낸 헤더로 11개 파일과 유니티 빌드(전체를 한 파일로 합침)를 `-Wall -Wextra -Wshadow`로 검사해 오류 없음

못 함 — 실제 언리얼 에디터에서 확인 필요
- **실제 UE5 빌드·실행은 하지 못했습니다.** 작업 환경에 언리얼 엔진이 없습니다. 위 문법 검사는 "제가 가정한 UE API"를 기준으로 한 것이라, 엔진 버전에 따라 함수 이름·인자가 다르면 빌드 오류가 날 수 있습니다. 오류가 나면 메시지를 알려주세요.
- **한글 문자열**: 코어 소스에 한글 문자열(물고기·AI 이름, 오류 문구)이 있습니다. HUD는 영어로 표시해서 화면에는 영향이 없지만, MSVC가 소스를 UTF-8로 읽지 않으면 경고가 날 수 있습니다.
- **Water 바다**: `Water` 플러그인을 켜고(.uproject) `AYPCourse::SpawnWaterOcean`이 실행 중 `AWaterZone`+`AWaterBodyOcean`을 만듭니다. 레벨에 직접 놓은 Ocean이 있으면 그것을 쓰고, 만들지 못하면 평평한 바다로 대신합니다. **확인 필요**: Water 클래스·함수 이름(`SetZoneExtent` 등)과 런타임 생성 동작은 UE 5.4 기준 추정이며 실행해 보지 못했습니다. 또한 제트스키·부표의 출렁임은 게임 규칙의 파도(`yp::waveHeight`)를 쓰므로 Water의 물결과 높이가 일치하지 않습니다(웹 버전과의 동일성을 지키려는 선택). Water 파도 진폭을 낮추거나, 필요하면 수면 높이 질의로 바꾸세요.
- **그래픽**: 기본 도형이라 웹 버전보다 단순합니다. 아래 "다음 단계"로 바꿀 수 있습니다.

## 다음 단계 (선택)

- **실제 모델**: 생성 이미지 기반 제트스키·요트 메시를 임포트해 `AYPJetSki::Build`, `YPParadise.cpp`의 `BuildItem`에서 기본 도형 대신 사용
- **녹음 사운드**: `docs/boat-sound-prompts.md`의 프롬프트로 만든 파일을 임포트해 엔진 루프를 `UAudioComponent`로 재생 (합성기는 효과음만 담당)
- **한글 HUD**: 한글 글리프가 있는 폰트 에셋을 만들어 `AYPHUD::Font()`에서 사용
