import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedOption = { group: string; name: string; extra?: number; required?: boolean };
type SeedItem = {
  name: string;
  description?: string;
  priceWon: number;
  popular?: boolean;
  options?: SeedOption[];
};
type SeedGroup = { name: string; items: SeedItem[] };
type SeedRestaurant = {
  name: string;
  description: string;
  categorySlug: string;
  minOrderWon: number;
  deliveryFeeWon: number;
  deliveryMin: number;
  deliveryMax: number;
  ratingAvg: number;
  reviewCount: number;
  imageUrl: string;
  roadAddress: string;
  lat: number;
  lng: number;
  menu: SeedGroup[];
};

const CATEGORIES = [
  { slug: "chicken", name: "치킨", iconKey: "drumstick" },
  { slug: "pizza", name: "피자", iconKey: "pizza" },
  { slug: "chinese", name: "중식", iconKey: "noodles" },
  { slug: "korean", name: "한식", iconKey: "rice" },
  { slug: "bunsik", name: "분식", iconKey: "fish-cake" },
  { slug: "burger", name: "버거", iconKey: "burger" },
  { slug: "cafe", name: "카페·디저트", iconKey: "coffee" },
  { slug: "night", name: "야식", iconKey: "moon" },
];

const RESTAURANTS: SeedRestaurant[] = [
  {
    name: "BBQ 황금올리브 강남점",
    description: "바삭한 올리브유 치킨",
    categorySlug: "chicken",
    minOrderWon: 15000,
    deliveryFeeWon: 3000,
    deliveryMin: 25,
    deliveryMax: 40,
    ratingAvg: 4.7,
    reviewCount: 1243,
    imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=800",
    roadAddress: "서울 강남구 테헤란로 123",
    lat: 37.5012,
    lng: 127.0396,
    menu: [
      {
        name: "대표 메뉴",
        items: [
          {
            name: "황금올리브 후라이드",
            description: "바삭한 기본 후라이드",
            priceWon: 20000,
            popular: true,
            options: [
              { group: "맛", name: "순한맛", required: true },
              { group: "맛", name: "매운맛", extra: 1000, required: true },
            ],
          },
          {
            name: "자메이카 통다리 구이",
            description: "직화구이 스타일",
            priceWon: 22000,
            popular: true,
          },
          { name: "치즐링", description: "치즈 스노잉", priceWon: 23000 },
        ],
      },
      {
        name: "사이드",
        items: [
          { name: "치즈스틱", priceWon: 4000 },
          { name: "감자튀김", priceWon: 4500 },
          {
            name: "콜라 1.25L",
            priceWon: 3500,
            options: [
              { group: "종류", name: "코카콜라", required: true },
              { group: "종류", name: "제로콜라", required: true },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "교촌치킨 마포점",
    description: "허니콤보의 원조",
    categorySlug: "chicken",
    minOrderWon: 16000,
    deliveryFeeWon: 3500,
    deliveryMin: 30,
    deliveryMax: 45,
    ratingAvg: 4.6,
    reviewCount: 982,
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800",
    roadAddress: "서울 마포구 월드컵북로 44",
    lat: 37.5563,
    lng: 126.9131,
    menu: [
      {
        name: "대표 메뉴",
        items: [
          { name: "허니콤보", priceWon: 23000, popular: true },
          { name: "레드콤보", priceWon: 23000, popular: true },
          { name: "오리지날", priceWon: 19000 },
        ],
      },
      {
        name: "사이드",
        items: [
          { name: "치킨무", priceWon: 1000 },
          { name: "치즈볼 5개", priceWon: 3500 },
        ],
      },
    ],
  },
  {
    name: "피자알볼로 역삼점",
    description: "건강한 수제 피자",
    categorySlug: "pizza",
    minOrderWon: 18000,
    deliveryFeeWon: 3000,
    deliveryMin: 30,
    deliveryMax: 50,
    ratingAvg: 4.5,
    reviewCount: 712,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
    roadAddress: "서울 강남구 역삼로 200",
    lat: 37.5012,
    lng: 127.0365,
    menu: [
      {
        name: "시그니처 피자",
        items: [
          {
            name: "고르곤졸라 피자",
            priceWon: 24900,
            popular: true,
            options: [
              { group: "사이즈", name: "R (25cm)", required: true },
              { group: "사이즈", name: "L (33cm)", extra: 8000, required: true },
            ],
          },
          {
            name: "불고기 피자",
            priceWon: 25900,
            popular: true,
            options: [
              { group: "사이즈", name: "R (25cm)", required: true },
              { group: "사이즈", name: "L (33cm)", extra: 8000, required: true },
            ],
          },
          {
            name: "페퍼로니 피자",
            priceWon: 22900,
            options: [
              { group: "사이즈", name: "R (25cm)", required: true },
              { group: "사이즈", name: "L (33cm)", extra: 8000, required: true },
            ],
          },
        ],
      },
      {
        name: "사이드",
        items: [
          { name: "콜라 500ml", priceWon: 2000 },
          { name: "치즈스틱 6개", priceWon: 6000 },
        ],
      },
    ],
  },
  {
    name: "도미노피자 강남역",
    description: "도미노의 정석",
    categorySlug: "pizza",
    minOrderWon: 17000,
    deliveryFeeWon: 2500,
    deliveryMin: 25,
    deliveryMax: 40,
    ratingAvg: 4.4,
    reviewCount: 1520,
    imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800",
    roadAddress: "서울 강남구 강남대로 396",
    lat: 37.4979,
    lng: 127.0276,
    menu: [
      {
        name: "프리미엄",
        items: [
          { name: "슈퍼디럭스", priceWon: 28900, popular: true },
          { name: "치즈랜드", priceWon: 27900 },
        ],
      },
      {
        name: "클래식",
        items: [
          { name: "페퍼로니", priceWon: 21900 },
          { name: "포테이토", priceWon: 22900 },
        ],
      },
    ],
  },
  {
    name: "홍콩반점 0410 신논현점",
    description: "백종원의 짜장면",
    categorySlug: "chinese",
    minOrderWon: 12000,
    deliveryFeeWon: 2000,
    deliveryMin: 20,
    deliveryMax: 35,
    ratingAvg: 4.3,
    reviewCount: 856,
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
    roadAddress: "서울 강남구 봉은사로 100",
    lat: 37.5047,
    lng: 127.0256,
    menu: [
      {
        name: "면 요리",
        items: [
          { name: "짜장면", priceWon: 7000, popular: true },
          { name: "짬뽕", priceWon: 8500, popular: true },
          { name: "볶음짬뽕", priceWon: 9500 },
        ],
      },
      {
        name: "밥 / 요리",
        items: [
          { name: "볶음밥", priceWon: 8000 },
          { name: "탕수육 (小)", priceWon: 18000 },
          { name: "깐풍기", priceWon: 22000 },
        ],
      },
    ],
  },
  {
    name: "본죽 논현점",
    description: "정성 가득한 한 그릇",
    categorySlug: "korean",
    minOrderWon: 10000,
    deliveryFeeWon: 2500,
    deliveryMin: 20,
    deliveryMax: 35,
    ratingAvg: 4.6,
    reviewCount: 412,
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
    roadAddress: "서울 강남구 논현로 150",
    lat: 37.5108,
    lng: 127.0214,
    menu: [
      {
        name: "프리미엄 죽",
        items: [
          { name: "전복죽", priceWon: 16000, popular: true },
          { name: "소고기버섯죽", priceWon: 11000 },
          { name: "낙지김치죽", priceWon: 11500 },
        ],
      },
      {
        name: "보양 죽",
        items: [
          { name: "야채죽", priceWon: 8000 },
          { name: "호박죽", priceWon: 8000 },
        ],
      },
    ],
  },
  {
    name: "김밥천국 서초점",
    description: "모든 것이 다 있는 그곳",
    categorySlug: "bunsik",
    minOrderWon: 9000,
    deliveryFeeWon: 2000,
    deliveryMin: 15,
    deliveryMax: 30,
    ratingAvg: 4.2,
    reviewCount: 2103,
    imageUrl: "https://images.unsplash.com/photo-1583224964978-2257b960c3d3?w=800",
    roadAddress: "서울 서초구 서초대로 300",
    lat: 37.4917,
    lng: 127.0086,
    menu: [
      {
        name: "분식",
        items: [
          { name: "참치김밥", priceWon: 4500, popular: true },
          { name: "치즈김밥", priceWon: 4000 },
          { name: "라면", priceWon: 4500 },
          { name: "떡볶이", priceWon: 5500, popular: true },
          { name: "순대", priceWon: 5000 },
        ],
      },
      {
        name: "식사",
        items: [
          { name: "김치찌개", priceWon: 7500 },
          { name: "제육덮밥", priceWon: 8000 },
        ],
      },
    ],
  },
  {
    name: "엽기떡볶이 강남점",
    description: "대한민국 매운맛 1위",
    categorySlug: "bunsik",
    minOrderWon: 12000,
    deliveryFeeWon: 3000,
    deliveryMin: 25,
    deliveryMax: 40,
    ratingAvg: 4.5,
    reviewCount: 3250,
    imageUrl: "https://images.unsplash.com/photo-1635363638580-c2809d049eee?w=800",
    roadAddress: "서울 강남구 강남대로 320",
    lat: 37.4975,
    lng: 127.0281,
    menu: [
      {
        name: "엽기 떡볶이",
        items: [
          {
            name: "엽기떡볶이",
            priceWon: 16000,
            popular: true,
            options: [
              { group: "맛", name: "덜 맵게", required: true },
              { group: "맛", name: "보통", required: true },
              { group: "맛", name: "맵게", required: true },
              { group: "맛", name: "엽기", extra: 0, required: true },
            ],
          },
          { name: "엽기오뎅", priceWon: 9000 },
          { name: "엽기닭날개", priceWon: 13000 },
        ],
      },
    ],
  },
  {
    name: "맘스터치 논현점",
    description: "싸이순살의 원조",
    categorySlug: "burger",
    minOrderWon: 12000,
    deliveryFeeWon: 2500,
    deliveryMin: 20,
    deliveryMax: 35,
    ratingAvg: 4.4,
    reviewCount: 1820,
    imageUrl: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800",
    roadAddress: "서울 강남구 논현로 180",
    lat: 37.5114,
    lng: 127.0223,
    menu: [
      {
        name: "버거",
        items: [
          { name: "싸이버거", priceWon: 5500, popular: true },
          { name: "불싸이버거", priceWon: 6200, popular: true },
          { name: "휠렛버거", priceWon: 5000 },
        ],
      },
      {
        name: "치킨",
        items: [
          { name: "싸이순살", priceWon: 14000 },
          { name: "후라이드", priceWon: 16000 },
        ],
      },
    ],
  },
  {
    name: "이디야커피 강남본점",
    description: "따뜻한 한 잔의 여유",
    categorySlug: "cafe",
    minOrderWon: 8000,
    deliveryFeeWon: 2500,
    deliveryMin: 15,
    deliveryMax: 25,
    ratingAvg: 4.3,
    reviewCount: 520,
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
    roadAddress: "서울 강남구 테헤란로 50",
    lat: 37.4995,
    lng: 127.0326,
    menu: [
      {
        name: "커피",
        items: [
          {
            name: "아메리카노",
            priceWon: 3200,
            popular: true,
            options: [
              { group: "온도", name: "HOT", required: true },
              { group: "온도", name: "ICE", required: true },
              { group: "사이즈", name: "Regular", required: true },
              { group: "사이즈", name: "Large", extra: 500, required: true },
            ],
          },
          {
            name: "카페라떼",
            priceWon: 4000,
            options: [
              { group: "온도", name: "HOT", required: true },
              { group: "온도", name: "ICE", required: true },
            ],
          },
        ],
      },
      {
        name: "디저트",
        items: [
          { name: "티라미수", priceWon: 5500 },
          { name: "크로플", priceWon: 5000 },
        ],
      },
    ],
  },
  {
    name: "족발야식당 강남점",
    description: "밤에 더 맛있는",
    categorySlug: "night",
    minOrderWon: 20000,
    deliveryFeeWon: 3500,
    deliveryMin: 30,
    deliveryMax: 50,
    ratingAvg: 4.5,
    reviewCount: 640,
    imageUrl: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=800",
    roadAddress: "서울 강남구 도산대로 80",
    lat: 37.5196,
    lng: 127.0219,
    menu: [
      {
        name: "족발",
        items: [
          {
            name: "오리지널 족발",
            priceWon: 32000,
            popular: true,
            options: [
              { group: "사이즈", name: "中", required: true },
              { group: "사이즈", name: "大", extra: 10000, required: true },
            ],
          },
          { name: "매운 족발", priceWon: 34000 },
        ],
      },
      {
        name: "사이드",
        items: [
          { name: "쟁반국수", priceWon: 9000 },
          { name: "막국수", priceWon: 8000 },
        ],
      },
    ],
  },
  {
    name: "미스터도넛 강남역점",
    description: "달콤한 밤의 유혹",
    categorySlug: "night",
    minOrderWon: 10000,
    deliveryFeeWon: 2500,
    deliveryMin: 20,
    deliveryMax: 35,
    ratingAvg: 4.3,
    reviewCount: 290,
    imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800",
    roadAddress: "서울 강남구 강남대로 450",
    lat: 37.504,
    lng: 127.0289,
    menu: [
      {
        name: "도넛",
        items: [
          { name: "허니딥", priceWon: 1800, popular: true },
          { name: "초코링", priceWon: 2000 },
          { name: "스트로베리 스노우볼", priceWon: 2200 },
        ],
      },
      {
        name: "음료",
        items: [
          { name: "아메리카노", priceWon: 3500 },
          { name: "우유", priceWon: 2500 },
        ],
      },
    ],
  },
];

async function main() {
  console.log("[seed] Clearing existing data...");
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuOption.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuGroup.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  console.log("[seed] Inserting categories...");
  const categoryMap = new Map<string, string>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const created = await prisma.category.create({
      data: { slug: c.slug, name: c.name, iconKey: c.iconKey, sort: i },
    });
    categoryMap.set(c.slug, created.id);
  }

  console.log("[seed] Inserting restaurants + menus...");
  for (const r of RESTAURANTS) {
    const categoryId = categoryMap.get(r.categorySlug);
    if (!categoryId) throw new Error(`Unknown category ${r.categorySlug}`);

    const rest = await prisma.restaurant.create({
      data: {
        name: r.name,
        description: r.description,
        categoryId,
        roadAddress: r.roadAddress,
        lat: r.lat,
        lng: r.lng,
        minOrderWon: r.minOrderWon,
        deliveryFeeWon: r.deliveryFeeWon,
        deliveryMinutesMin: r.deliveryMin,
        deliveryMinutesMax: r.deliveryMax,
        ratingAvg: r.ratingAvg,
        reviewCount: r.reviewCount,
        imageUrl: r.imageUrl,
      },
    });

    for (let gi = 0; gi < r.menu.length; gi++) {
      const g = r.menu[gi];
      const group = await prisma.menuGroup.create({
        data: { restaurantId: rest.id, name: g.name, sort: gi },
      });
      for (let ii = 0; ii < g.items.length; ii++) {
        const item = g.items[ii];
        const created = await prisma.menuItem.create({
          data: {
            menuGroupId: group.id,
            name: item.name,
            description: item.description,
            priceWon: item.priceWon,
            isPopular: item.popular ?? false,
            sort: ii,
          },
        });
        if (item.options && item.options.length > 0) {
          for (let oi = 0; oi < item.options.length; oi++) {
            const o = item.options[oi];
            await prisma.menuOption.create({
              data: {
                menuItemId: created.id,
                groupName: o.group,
                name: o.name,
                extraPriceWon: o.extra ?? 0,
                isRequired: o.required ?? false,
                sort: oi,
              },
            });
          }
        }
      }
    }
    console.log(`  ✓ ${r.name}`);
  }

  console.log("[seed] Creating demo user...");
  const demo = await prisma.user.create({
    data: {
      email: "demo@baedal.dev",
      hashedPassword: await bcrypt.hash("demo1234", 10),
      name: "데모",
      phone: "010-0000-0000",
    },
  });
  await prisma.address.create({
    data: {
      userId: demo.id,
      label: "집",
      roadAddress: "서울 강남구 테헤란로 152",
      detail: "101동 1001호",
      lat: 37.5012,
      lng: 127.0396,
      isDefault: true,
    },
  });

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
