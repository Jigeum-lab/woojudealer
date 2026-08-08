export type Role = "company" | "admin";

export type Provider = "google" | "kakao" | "naver" | "admin" | "email";

export type RequestStatus =
  | "requested"
  | "pickup"
  | "wiping"
  | "certified"
  | "done";

export const STATUS_ORDER: RequestStatus[] = [
  "requested",
  "pickup",
  "wiping",
  "certified",
  "done",
];

export const STATUS_META: Record<
  RequestStatus,
  { label: string; desc: string; badge: string }
> = {
  requested: { label: "신청 접수", desc: "신청이 접수되었습니다", badge: "requested" },
  pickup: { label: "수거 진행", desc: "수거 기사가 방문합니다", badge: "pickup" },
  wiping: { label: "보안삭제 중", desc: "DoD 5220.22-M 삭제 진행", badge: "wiping" },
  certified: { label: "인증서 발급", desc: "보안삭제 인증서 발급 완료", badge: "certified" },
  done: { label: "처리 완료", desc: "모든 처리가 완료되었습니다", badge: "done" },
};

export interface Company {
  id: string;
  name: string;
  bizNo: string;
  contact: string;
  phone: string;
  address: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  provider: Provider;
  companyId: string | null;
  role: Role;
  termsAgreed: boolean;
}

export interface RequestItems {
  quantity: number;
  manufacturer: string;
  age: string;
  os: string;
  note?: string;
}

export interface PickupInfo {
  date: string;
  timeSlot: string;
  address: string;
  request?: string;
}

export interface CollectionRequest {
  id: string;
  companyId: string;
  items: RequestItems;
  pickup: PickupInfo;
  status: RequestStatus;
  createdAt: string;
}

export interface Certificate {
  id: string;
  requestId: string;
  certNo: string;
  dodMethod: string;
  issuedAt: string;
  qrToken: string;
}

export type SettlementStatus = "pending" | "processing" | "paid";

export interface Settlement {
  id: string;
  requestId: string;
  companyId: string;
  amount: number;
  status: SettlementStatus;
  note?: string;
  paidAt?: string;
  createdAt: string;
}

export const SETTLEMENT_META: Record<SettlementStatus, { label: string; color: string }> = {
  pending:    { label: "정산 대기",    color: "text-yellow-400" },
  processing: { label: "정산 처리 중", color: "text-blue-400" },
  paid:       { label: "정산 완료",    color: "text-primary" },
};

export const MANUFACTURERS = ["Dell", "HP", "Lenovo", "삼성", "기타"] as const;
export const PC_AGES = ["~3년", "3~5년", "5년 이상"] as const;
export const OS_OPTIONS = ["Windows 10", "Windows 11", "Linux", "기타"] as const;
export const TIME_SLOTS = ["오전 (09:00~12:00)", "오후 (13:00~17:00)"] as const;

export const CARBON_PER_PC = 25; // kgCO2
export const VALUE_PER_PC = 200_000; // 원
export const DOD_METHOD = "DoD 5220.22-M";

// =====================================================
// 견적 시스템 (우주시스템 견적서 ver.8.0.2 엑셀 이식)
// =====================================================

export type PartCategory =
  | "cpu"
  | "mainboard"
  | "memory"
  | "ssd"
  | "hdd"
  | "gpu"
  | "psu"
  | "case"
  | "cpu_cooler"
  | "case_fan"
  | "rgb_controller"
  | "ssd_heatsink"
  | "memory_heatsink"
  | "tuning"
  | "labor_as"
  | "keyboard"
  | "mouse"
  | "speaker"
  | "headset"
  | "monitor"
  | "extra";

export type PartPlatform = "amd" | "intel" | "common";

/**
 * 견적서 구성 그룹.
 * 엑셀 견적양식은 본체(CPU~튜닝) 소계를 낸 뒤, 공임·주변기기를 더해
 * "추가품목까지 총 합계"를 따로 낸다. 그 2단 구조를 그대로 따른다.
 */
export type PartGroup = "core" | "service" | "peripheral";

/** 슬롯 순서는 엑셀 출력폼(AMD출력폼 시트) 기준 — 인쇄물과 같은 순서 */
export const CATEGORY_META: Record<
  PartCategory,
  { label: string; group: PartGroup; order: number }
> = {
  cpu:             { label: "CPU",        group: "core",       order: 1 },
  cpu_cooler:      { label: "CPU쿨러",     group: "core",       order: 2 },
  mainboard:       { label: "마더보드",     group: "core",       order: 3 },
  memory:          { label: "메모리",      group: "core",       order: 4 },
  ssd:             { label: "SSD",        group: "core",       order: 5 },
  hdd:             { label: "HDD",        group: "core",       order: 6 },
  gpu:             { label: "그래픽카드",   group: "core",       order: 7 },
  psu:             { label: "파워",        group: "core",       order: 8 },
  case:            { label: "케이스",      group: "core",       order: 9 },
  case_fan:        { label: "케이스 팬",    group: "core",       order: 10 },
  rgb_controller:  { label: "RGB 컨트롤",  group: "core",       order: 11 },
  ssd_heatsink:    { label: "SSD 방열판",  group: "core",       order: 12 },
  memory_heatsink: { label: "메모리 방열판", group: "core",      order: 13 },
  tuning:          { label: "튜닝",        group: "core",       order: 14 },
  labor_as:        { label: "공임 & AS",   group: "service",    order: 15 },
  keyboard:        { label: "키보드",      group: "peripheral", order: 16 },
  mouse:           { label: "마우스",      group: "peripheral", order: 17 },
  speaker:         { label: "스피커",      group: "peripheral", order: 18 },
  headset:         { label: "헤드셋",      group: "peripheral", order: 19 },
  monitor:         { label: "모니터",      group: "peripheral", order: 20 },
  extra:           { label: "추가품목",     group: "peripheral", order: 21 },
};

export const CATEGORY_ORDER: PartCategory[] = (
  Object.keys(CATEGORY_META) as PartCategory[]
).sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order);

/** CPU·마더보드만 AMD/INTEL을 타고 나머지는 공용 */
export const PLATFORM_BOUND: PartCategory[] = ["cpu", "mainboard"];

export interface Part {
  id: string;
  partNo: number | null;
  category: PartCategory;
  platform: PartPlatform;
  name: string;
  price: number;
  soldOut: boolean;
  grade: string | null;
  link: string | null;
  /** 카테고리마다 키가 다르다 — compatibility.ts가 해석한다 */
  specs: Record<string, string | number | null>;
  /** 재고 수량. inventory 조인 결과가 없으면 null (재고 미등록) */
  stock: number | null;
}

export interface QuoteItem {
  id: string;
  category: PartCategory;
  partId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

export type QuoteStatus = "draft" | "sent" | "ordered" | "canceled";

export interface Quote {
  id: string;
  displayNo: string;
  platform: PartPlatform;
  customerName: string;
  companyId: string | null;
  quoteDate: string;
  vatIncluded: boolean;
  total: number;
  status: QuoteStatus;
  note: string | null;
  items: QuoteItem[];
  createdAt: string;
}

export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; color: string }> = {
  draft:    { label: "작성 중",   color: "text-text-muted" },
  sent:     { label: "발송 완료", color: "text-blue-400" },
  ordered:  { label: "주문 확정", color: "text-primary" },
  canceled: { label: "취소",     color: "text-red-400" },
};

/** 견적 유효기간·납기 등 엑셀 출력폼의 고정 문구 */
export const QUOTE_TERMS = {
  validity: "발행일로부터 1일간",
  delivery: "결제후 72시간(토/일요일, 공휴일 제외)",
  warranty: "제품 납기 후 1년 무상보증(일부품목 제외)",
} as const;

export const VAT_RATE = 0.1;

/* ── 견적 요청 (inquiries) ────────────────────────────
   수거 신청 앞단의 문의 단계. 로그인 없이도 남길 수 있다. */

/** 고객 시점의 방향 — 우리에게 팔거나(매입), 우리에게서 사거나(판매) */
export type InquiryKind = "sell_to_us" | "buy_from_us";

export type InquiryStatus = "new" | "contacted" | "quoted" | "closed";

export const INQUIRY_KIND_META: Record<
  InquiryKind,
  { label: string; short: string }
> = {
  sell_to_us: { label: "매입 견적 (폐PC 처분)", short: "매입" },
  buy_from_us: { label: "판매 견적 (재생PC 구매)", short: "판매" },
};

export const INQUIRY_STATUS_META: Record<
  InquiryStatus,
  { label: string; color: string }
> = {
  new: { label: "접수", color: "text-primary" },
  contacted: { label: "연락 완료", color: "text-status-pickup" },
  quoted: { label: "견적 발송", color: "text-status-wiping" },
  closed: { label: "종료", color: "text-text-muted" },
};

export interface Inquiry {
  id: string;
  displayNo: string;
  kind: InquiryKind;
  status: InquiryStatus;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  quantity: number;
  specLevel?: string;
  purchasePeriod?: string;
  purpose?: string;
  budgetPerUnit?: number;
  note?: string;
  adminMemo?: string;
  createdAt: string;
}

/** 우주딜러 운영사 (인증서 발급 주체) — 사업자등록증 기준 */
export const ISSUER = {
  name: "주식회사 우주시스템",
  brand: "우주딜러",
  bizNo: "212-86-16434",
  corpNo: "230111-0398593",
  ceo: "우정현",
  founded: "2023.09.21",
  address: "울산광역시 울주군 웅촌면 곡천동문길 32, 4-10호",
  email: "153net@daum.net",
  taxOffice: "울산세무서장",
} as const;
