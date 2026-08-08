"use client";

import { createClient } from "@/lib/supabase/client";
import type { Inquiry, InquiryKind, InquiryStatus } from "@/lib/types";

interface InquiryRow {
  id: string;
  display_no: string;
  kind: InquiryKind;
  status: InquiryStatus;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  company_name: string | null;
  quantity: number;
  spec_level: string | null;
  purchase_period: string | null;
  purpose: string | null;
  budget_per_unit: number | null;
  note: string | null;
  admin_memo: string | null;
  created_at: string;
}

function mapInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    displayNo: row.display_no,
    kind: row.kind,
    status: row.status,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email ?? undefined,
    companyName: row.company_name ?? undefined,
    quantity: row.quantity,
    specLevel: row.spec_level ?? undefined,
    purchasePeriod: row.purchase_period ?? undefined,
    purpose: row.purpose ?? undefined,
    budgetPerUnit: row.budget_per_unit ?? undefined,
    note: row.note ?? undefined,
    adminMemo: row.admin_memo ?? undefined,
    createdAt: row.created_at,
  };
}

export interface InquiryDraft {
  kind: InquiryKind;
  contactName: string;
  contactPhone: string;
  quantity: number;
  contactEmail?: string;
  companyName?: string;
  specLevel?: string;
  purchasePeriod?: string;
  purpose?: string;
  budgetPerUnit?: number;
  note?: string;
}

/**
 * 견적 요청 접수. 로그인 없이도 호출된다(submit_inquiry는 anon에도 열려 있음).
 * 접수번호(INQ-2026-0001)를 돌려준다.
 */
export async function submitInquiry(draft: InquiryDraft): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_inquiry", {
    p_kind: draft.kind,
    p_contact_name: draft.contactName,
    p_contact_phone: draft.contactPhone,
    p_quantity: draft.quantity,
    p_contact_email: draft.contactEmail ?? null,
    p_company_name: draft.companyName ?? null,
    p_spec_level: draft.specLevel ?? null,
    p_purchase_period: draft.purchasePeriod ?? null,
    p_purpose: draft.purpose ?? null,
    p_budget_per_unit: draft.budgetPerUnit ?? null,
    p_note: draft.note ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** 관리자 문의함 — RLS가 관리자에게만 전체를 준다 */
export async function fetchInquiries(): Promise<Inquiry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as InquiryRow[]).map(mapInquiry);
}

export async function setInquiryStatus(
  id: string,
  status: InquiryStatus
): Promise<Inquiry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapInquiry(data as InquiryRow);
}
