"use client";

import { createClient } from "@/lib/supabase/client";
import type { Settlement, SettlementStatus } from "@/lib/types";
import { mapSettlement, type SettlementRow } from "./types";

export async function fetchAllSettlements(): Promise<Settlement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as SettlementRow[]).map(mapSettlement);
}

export async function fetchSettlementsByCompany(
  companyId: string | null
): Promise<Settlement[]> {
  if (!companyId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as SettlementRow[]).map(mapSettlement);
}

export async function updateSettlementStatus(
  id: string,
  status: SettlementStatus,
  note?: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("settlements")
    .update({
      status,
      note: note ?? null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}
