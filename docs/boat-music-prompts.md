# 요트 파라다이스 레이싱 — 배경음악 프롬프트 (MusicGen medium용)

`http://127.0.0.1:7860` (MusicGen medium 웹 화면)에 그대로 붙여 넣는 프롬프트입니다.
MusicGen은 한 번에 약 30초까지 만들기 좋으므로 **30초 루프**를 기준으로 했습니다.

## 공통 설정 (권장값)
- Model: `facebook/musicgen-medium`
- Duration: 30초 (결과 화면 징글은 8~10초)
- Top-k 250, Temperature 1.0, CFG(Classifier Free Guidance) 3.0
- 유치하지 않게: 모든 프롬프트에 `no vocals, no chiptune, no cartoon` 류 문구를 넣었습니다.
- 같은 곡 분위기를 이어 가려면 **1번 결과를 Melody/Audio 조건으로 넣고** 나머지를 만들면 통일감이 좋아집니다 (UI에 해당 입력이 있을 때).

## 저장할 파일명
게임에 넣을 때 `public/boat/music/<파일명>.mp3` 로 저장해 주세요.

---

### 1. title — 타이틀 화면 (30초, 루프)
> luxury tropical house, 112 bpm, A minor, warm deep bass, crisp four-on-the-floor kick, airy plucked synth arpeggio, soft steel drum accents, wide pads, sunny yacht club mood, polished modern production, seamless loop, no vocals, no chiptune, no cartoon

### 2. paradise — 섬 건설 화면 (30초, 루프)
> chill balearic lounge, 96 bpm, D major, mellow electric piano chords, soft nylon guitar, gentle shaker and conga groove, warm sub bass, ocean breeze ambience, relaxed luxury resort afternoon, seamless loop, no vocals, no chiptune, no cartoon

### 3. race — 레이스 기본 (30초, 루프)
> driving electronic racing music, 128 bpm, E minor, punchy kick and tight claps, aggressive saw-wave bass, pulsing sidechained synths, rising arpeggios, energetic but sleek, premium racing game soundtrack, high speed over water, seamless loop, no vocals, no chiptune, no cartoon

### 4. race-final — 마지막 랩 (30초, 루프)
> intense final lap racing music, 136 bpm, E minor, heavy driving drums, distorted reese bass, urgent staccato strings, fast synth arpeggio, tension building risers, adrenaline, premium racing game soundtrack, seamless loop, no vocals, no chiptune, no cartoon

### 5. win — 우승 결과 징글 (8~10초)
> triumphant short victory sting, 120 bpm, C major, bright brass stabs, big snare roll into cymbal crash, uplifting synth chord, luxury celebration, clean ending with natural decay, no vocals, no chiptune, no cartoon

### 6. lose — 2~6위 결과 징글 (8~10초)
> short reflective result sting, 90 bpm, A minor, soft piano chord, warm pad swell, gentle bass note, calm determined mood, not sad, clean ending with natural decay, no vocals, no chiptune, no cartoon

---

## 생성 후 확인할 것
- 루프 곡(1~4)은 처음과 끝이 자연스럽게 이어지는지 (어긋나면 끝 0.5초 페이드아웃 후 루프)
- 엔진 소리와 겹치므로 레이스곡(3·4)은 **중저음이 너무 크지 않은 것**을 고르기
- 보컬처럼 들리는 소리가 섞이면 다시 생성
