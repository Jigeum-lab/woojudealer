import {
  Certificate,
  CollectionRequest,
  Company,
  DOD_METHOD,
  RequestStatus,
  STATUS_ORDER,
  User,
} from "./types";

const KEY = {
  companies: "wj.companies",
  users: "wj.users",
  requests: "wj.requests",
  certificates: "wj.certificates",
  session: "wj.session",
  seeded: "wj.seeded",
  draft: "wj.requestDraft",
} as const;

const SEED_VERSION = "v1";

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("wj:change"));
}

/* ---------------- Seed ---------------- */

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function buildSeed() {
  const companies: Company[] = [
    {
      id: "c1",
      name: "주식회사 예시기업",
      bizNo: "123-45-67890",
      contact: "홍길동",
      phone: "010-1234-5678",
      address: "서울특별시 강남구 테헤란로 123, 8층",
    },
    {
      id: "c2",
      name: "강남게임피씨방",
      bizNo: "211-86-22345",
      contact: "김민준",
      phone: "010-2222-3456",
      address: "서울특별시 강남구 강남대로 246",
    },
    {
      id: "c3",
      name: "테크노밸리(주)",
      bizNo: "314-81-55678",
      contact: "이서연",
      phone: "010-9876-5432",
      address: "경기도 성남시 분당구 판교로 250",
    },
  ];

  const users: User[] = [
    {
      id: "u_demo",
      email: "demo@example.com",
      name: "홍길동",
      provider: "google",
      companyId: "c1",
      role: "company",
      termsAgreed: true,
    },
    {
      id: "u_admin",
      email: "admin@woojudealer.com",
      name: "우정현",
      provider: "admin",
      companyId: null,
      role: "admin",
      termsAgreed: true,
    },
  ];

  const requests: CollectionRequest[] = [
    mkReq("REQ-2026-0001", "c1", 30, "Dell", "5년 이상", "Windows 10", "done", 92, 90),
    mkReq("REQ-2026-0002", "c1", 15, "HP", "3~5년", "Windows 11", "certified", 62, 60),
    mkReq("REQ-2026-0003", "c1", 8, "Lenovo", "~3년", "Windows 11", "wiping", 30, 5),
    mkReq("REQ-2026-0004", "c1", 22, "삼성", "3~5년", "Windows 10", "pickup", 28, 2),
    mkReq("REQ-2026-0005", "c1", 12, "Dell", "~3년", "Windows 11", "requested", 27, 1),
    mkReq("REQ-2026-0006", "c2", 40, "기타", "5년 이상", "기타", "done", 75, 73),
    mkReq("REQ-2026-0007", "c2", 18, "HP", "3~5년", "Windows 10", "certified", 33, 31),
    mkReq("REQ-2026-0008", "c3", 50, "Lenovo", "5년 이상", "Linux", "done", 120, 118),
    mkReq("REQ-2026-0009", "c3", 25, "Dell", "3~5년", "Windows 11", "wiping", 12, 4),
    mkReq("REQ-2026-0010", "c3", 10, "삼성", "~3년", "Windows 11", "requested", 6, 1),
  ];

  return { companies, users, requests };
}

function mkReq(
  id: string,
  companyId: string,
  quantity: number,
  manufacturer: string,
  age: string,
  os: string,
  status: RequestStatus,
  createdDaysAgo: number,
  pickupDaysAgo: number
): CollectionRequest {
  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() - pickupDaysAgo + 3);
  return {
    id,
    companyId,
    items: { quantity, manufacturer, age, os },
    pickup: {
      date: pickupDate.toISOString().slice(0, 10),
      timeSlot: "오전 (09:00~12:00)",
      address: "",
    },
    status,
    createdAt: daysAgo(createdDaysAgo),
  };
}

export function seedIfNeeded(): void {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(KEY.seeded) === SEED_VERSION) return;
  const { companies, users, requests } = buildSeed();
  window.localStorage.setItem(KEY.companies, JSON.stringify(companies));
  window.localStorage.setItem(KEY.users, JSON.stringify(users));
  window.localStorage.setItem(KEY.requests, JSON.stringify(requests));
  window.localStorage.setItem(KEY.certificates, JSON.stringify([]));
  window.localStorage.setItem(KEY.seeded, SEED_VERSION);
}

export function resetDemo(): void {
  if (!isBrowser()) return;
  Object.values(KEY).forEach((k) => window.localStorage.removeItem(k));
  seedIfNeeded();
  window.dispatchEvent(new Event("wj:change"));
}

/* ---------------- Companies ---------------- */

export const getCompanies = () => read<Company[]>(KEY.companies, []);
export const getCompany = (id: string | null) =>
  id ? getCompanies().find((c) => c.id === id) ?? null : null;

export function upsertCompany(company: Company): void {
  const list = getCompanies();
  const idx = list.findIndex((c) => c.id === company.id);
  if (idx >= 0) list[idx] = company;
  else list.push(company);
  write(KEY.companies, list);
}

/* ---------------- Users / Session ---------------- */

export const getUsers = () => read<User[]>(KEY.users, []);

export function upsertUser(user: User): void {
  const list = getUsers();
  const idx = list.findIndex((u) => u.id === user.id);
  if (idx >= 0) list[idx] = user;
  else list.push(user);
  write(KEY.users, list);
}

export const getSessionUserId = () => read<string | null>(KEY.session, null);

export function setSession(userId: string | null): void {
  write(KEY.session, userId);
}

export function getSessionUser(): User | null {
  const id = getSessionUserId();
  if (!id) return null;
  return getUsers().find((u) => u.id === id) ?? null;
}

/* ---------------- Requests ---------------- */

export const getAllRequests = () =>
  read<CollectionRequest[]>(KEY.requests, []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

export const getRequestsByCompany = (companyId: string | null) =>
  companyId ? getAllRequests().filter((r) => r.companyId === companyId) : [];

export const getRequest = (id: string) =>
  getAllRequests().find((r) => r.id === id) ?? null;

function nextRequestId(): string {
  const nums = getAllRequests()
    .map((r) => Number(r.id.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `REQ-2026-${String(next).padStart(4, "0")}`;
}

export function createRequest(
  data: Omit<CollectionRequest, "id" | "status" | "createdAt">
): CollectionRequest {
  const list = read<CollectionRequest[]>(KEY.requests, []);
  const req: CollectionRequest = {
    ...data,
    id: nextRequestId(),
    status: "requested",
    createdAt: new Date().toISOString(),
  };
  list.push(req);
  write(KEY.requests, list);
  return req;
}

function persistRequests(list: CollectionRequest[]): void {
  write(KEY.requests, list);
}

export function setRequestStatus(
  id: string,
  status: RequestStatus
): CollectionRequest | null {
  const list = read<CollectionRequest[]>(KEY.requests, []);
  const req = list.find((r) => r.id === id);
  if (!req) return null;
  req.status = status;
  persistRequests(list);
  if (statusReached(status, "certified")) ensureCertificate(id);
  return req;
}

export function advanceRequest(id: string): CollectionRequest | null {
  const req = getRequest(id);
  if (!req) return null;
  const idx = STATUS_ORDER.indexOf(req.status);
  if (idx >= STATUS_ORDER.length - 1) return req;
  return setRequestStatus(id, STATUS_ORDER[idx + 1]);
}

export function statusReached(
  status: RequestStatus,
  target: RequestStatus
): boolean {
  return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(target);
}

/* ---------------- Certificates ---------------- */

export const getCertificates = () =>
  read<Certificate[]>(KEY.certificates, []);

export function getCertificateByRequest(requestId: string): Certificate | null {
  return getCertificates().find((c) => c.requestId === requestId) ?? null;
}

export function ensureCertificate(requestId: string): Certificate | null {
  const req = getRequest(requestId);
  if (!req || !statusReached(req.status, "certified")) return null;
  const existing = getCertificateByRequest(requestId);
  if (existing) return existing;

  const list = getCertificates();
  const seq = list.length + 1;
  const cert: Certificate = {
    id: `cert_${requestId}`,
    requestId,
    certNo: `CERT-2026-${String(seq).padStart(5, "0")}`,
    dodMethod: DOD_METHOD,
    issuedAt: new Date().toISOString(),
  };
  list.push(cert);
  write(KEY.certificates, list);
  return cert;
}

/* ---------------- Draft (수거 신청 임시저장) ---------------- */

export const getDraft = <T>() => read<T | null>(KEY.draft, null);
export const setDraft = <T>(value: T) => write(KEY.draft, value);
export const clearDraft = () => {
  if (isBrowser()) window.localStorage.removeItem(KEY.draft);
};

export { KEY as STORE_KEYS };
