/**
 * DB row → 도메인 객체 변환 타입.
 * snake_case (Postgres) ↔ camelCase (TS) 매핑.
 */

import type {
  Certificate,
  CollectionRequest,
  Company,
  RequestStatus,
} from "@/lib/types";

export interface CompanyRow {
  id: string;
  name: string;
  biz_no: string;
  contact: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface RequestRow {
  id: string;
  display_no: string;
  company_id: string;
  created_by: string | null;
  status: RequestStatus;
  items_quantity: number;
  items_manufacturer: string | null;
  items_age: string | null;
  items_os: string | null;
  items_note: string | null;
  pickup_date: string | null;
  pickup_time_slot: string | null;
  pickup_address: string | null;
  pickup_request: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateRow {
  id: string;
  request_id: string;
  cert_no: string;
  dod_method: string;
  pdf_path: string | null;
  qr_token: string;
  issued_at: string;
}

export function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    bizNo: row.biz_no,
    contact: row.contact ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
  };
}

export function mapRequest(row: RequestRow): CollectionRequest {
  return {
    id: row.display_no,
    companyId: row.company_id,
    items: {
      quantity: row.items_quantity,
      manufacturer: row.items_manufacturer ?? "",
      age: row.items_age ?? "",
      os: row.items_os ?? "",
      note: row.items_note ?? undefined,
    },
    pickup: {
      date: row.pickup_date ?? "",
      timeSlot: row.pickup_time_slot ?? "",
      address: row.pickup_address ?? "",
      request: row.pickup_request ?? undefined,
    },
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    requestId: row.request_id,
    certNo: row.cert_no,
    dodMethod: row.dod_method,
    issuedAt: row.issued_at,
  };
}
