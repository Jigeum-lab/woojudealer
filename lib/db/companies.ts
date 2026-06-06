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
