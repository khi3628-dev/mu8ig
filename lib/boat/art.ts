// 게임 화면에 쓰는 이미지 (public/boat). 파일명을 한 곳에서 관리한다.
export const ART = {
  title: "/boat/title.webp", // 라이벌과의 경주 장면
  podium: "/boat/podium.webp", // 우승 시상대
  ski: "/boat/ski.webp", // 제트스키 대표 컷
  marlin: "/boat/marlin.webp", // 황금 청새치를 낚는 순간
  avatar: "/boat/avatar.webp", // 캐릭터 얼굴
} as const;

export const artBg = (src: string) => ({ backgroundImage: `url(${src})` });
