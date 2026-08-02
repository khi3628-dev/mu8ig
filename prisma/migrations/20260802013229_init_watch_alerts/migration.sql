-- CreateTable
CREATE TABLE "Watch" (
    "id" TEXT NOT NULL,
    "complexNo" TEXT NOT NULL,
    "complexName" TEXT NOT NULL,
    "tradeType" TEXT NOT NULL,
    "areaMinM2" DOUBLE PRECISION,
    "areaMaxM2" DOUBLE PRECISION,
    "maxPriceManwon" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "seededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeenArticle" (
    "id" TEXT NOT NULL,
    "watchId" TEXT NOT NULL,
    "articleNo" TEXT NOT NULL,
    "priceManwon" INTEGER,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeenArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Watch_complexNo_tradeType_key" ON "Watch"("complexNo", "tradeType");

-- CreateIndex
CREATE INDEX "SeenArticle_watchId_idx" ON "SeenArticle"("watchId");

-- CreateIndex
CREATE UNIQUE INDEX "SeenArticle_watchId_articleNo_key" ON "SeenArticle"("watchId", "articleNo");

-- AddForeignKey
ALTER TABLE "SeenArticle" ADD CONSTRAINT "SeenArticle_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
