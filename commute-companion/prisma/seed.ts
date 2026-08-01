import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TOPICS = [
  {
    slug: "kr-econ",
    label: "한국 경제",
    naverQuery: "한국 경제",
    description: "국내 거시경제·금리·환율·부동산",
  },
  {
    slug: "it-tech",
    label: "IT/테크",
    naverQuery: "IT 테크",
    description: "국내외 IT 산업·AI·스타트업",
  },
  {
    slug: "world",
    label: "국제",
    naverQuery: "국제 뉴스",
    description: "주요 국제 이슈",
  },
  {
    slug: "market",
    label: "증시",
    naverQuery: "코스피 증시",
    description: "코스피/코스닥·주요 종목",
  },
  {
    slug: "startup",
    label: "스타트업",
    naverQuery: "스타트업 투자",
    description: "국내 스타트업 투자·M&A",
  },
  {
    slug: "workplace",
    label: "직장/커리어",
    naverQuery: "직장인 커리어",
    description: "채용·연봉·업무 트렌드",
  },
];

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const SAMPLE_DEALS = [
  {
    title: "스타벅스 아메리카노T 기프티콘 12% 할인",
    category: "기프티콘",
    description: "니콘내콘 등 기프티콘 중고 마켓 최저가",
    discountLabel: "12% 할인",
    affiliateUrl: "https://www.niconcon.co.kr/",
    validTo: inDays(30),
  },
  {
    title: "CU 도시락 1,000원 할인 쿠폰",
    category: "편의점",
    description: "CU 앱 로그인 후 매장 결제 시 사용",
    discountLabel: "-₩1,000",
    affiliateUrl: "https://cu.bgfretail.com/",
    validTo: inDays(7),
  },
  {
    title: "삼성카드 taptap O — 스타벅스 30% 할인",
    category: "카드",
    description: "월 최대 5회, 실적 조건 충족 시",
    discountLabel: "30% 할인",
    affiliateUrl: "https://www.samsungcard.com/",
    validTo: inDays(60),
  },
  {
    title: "토스 만보기 — 하루 10,000보 100포인트",
    category: "앱테크",
    description: "출퇴근 도보로 자동 달성",
    discountLabel: "+100P/일",
    affiliateUrl: "https://toss.im/",
    validTo: inDays(365),
  },
];

async function main() {
  for (const t of TOPICS) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: t,
      create: t,
    });
  }
  console.log(`Seeded ${TOPICS.length} topics.`);

  for (const d of SAMPLE_DEALS) {
    const existing = await prisma.deal.findFirst({ where: { title: d.title } });
    if (existing) {
      await prisma.deal.update({ where: { id: existing.id }, data: d });
    } else {
      await prisma.deal.create({ data: d });
    }
  }
  console.log(`Seeded ${SAMPLE_DEALS.length} deals.`);

  const demoEmail = "demo@commute.local";
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail, name: "Demo User" },
  });
  await prisma.preference.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      topics: JSON.stringify(["kr-econ", "it-tech", "market"]),
      region: "서울",
      commuteStart: "08:00",
      commuteEnd: "18:30",
    },
  });
  console.log(`Seeded demo user ${demoEmail}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
