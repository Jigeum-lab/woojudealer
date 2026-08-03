"use client";

import { createClient } from "@/lib/supabase/client";
import type { Company } from "@/lib/types";

import { mapCompany, type CompanyRow } from "./types";

export async function fetchCompanies(): Promise<Company[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data as CompanyRow[]).map(mapCompany);
}

export async function fetchCompany(id: string | null): Promise<Company | null> {
  if (!id) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCompany(data as CompanyRow) : null;
}

/**
 * 회사 등록 + profiles.company_id 연결 (register_company RPC).
 * 이미 연결된 회사가 있으면 그 회사를 수정한다.
 * 동일 사업자번호가 존재하면 "BIZ_NO_TAKEN" 에러를 던진다.
 */
export async function registerCompany(
  company: Omit<Company, "id">
): Promise<Company> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("register_company", {
    p_name: company.name,
    p_biz_no: company.bizNo,
    p_contact: company.contact,
    p_phone: company.phone,
    p_address: company.address,
  });
  if (error) throw error;
  return mapCompany(data as CompanyRow);
}

export async function upsertCompany(
  company: Omit<Company, "id"> & { id?: string }
): Promise<Company> {
  const supabase = createClient();
  const payload = {
    ...(company.id ? { id: company.id } : {}),
    name: company.name,
    biz_no: company.bizNo,
    contact: company.contact,
    phone: company.phone,
    address: company.address,
  };
  const { data, error } = await supabase
    .from("companies")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapCompany(data as CompanyRow);
}
