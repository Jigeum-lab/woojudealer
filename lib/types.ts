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
