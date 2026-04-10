export interface NaverComplex {
  complexNo: string;
  complexName: string;
  cortarAddress: string;
  detailAddress: string;
  totalHouseholdCount: number;
  totalBuildingCount: number;
  highFloor: number;
  lowFloor: number;
  useApproveYmd: string; // 사용승인일 (YYYYMMDD)
}

export interface NaverArticle {
  articleNo: string;
  articleName: string;
  realEstateTypeName: string;
  tradeTypeName: string; // 매매, 전세, 월세
  dealOrWarrantPrc: string; // 매매가 or 보증금
  rentPrc: number; // 월세
  areaName: string;
  area1: number; // 공급면적 (m²)
  area2: number; // 전용면적 (m²)
  floorInfo: string; // 층수
  direction: string; // 방향
  articleConfirmYmd: string; // 매물 확인일
  articleFeatureDesc: string; // 매물 특징
  tagList: string[];
  buildingName: string;
  sameAddrMaxPrc: string;
  sameAddrMinPrc: string;
  realtorName: string;
  cpName: string;
}

export interface ComplexArticleResponse {
  articleList: NaverArticle[];
  isMoreData: boolean;
  pageSize: number;
}

export interface Listing {
  id: string;
  complexName: string;
  address: string;
  tradeType: string;
  price: string;
  rentPrice: number;
  supplyArea: number;
  exclusiveArea: number;
  floor: string;
  direction: string;
  confirmedDate: string;
  description: string;
  buildingName: string;
  realtorName: string;
}
