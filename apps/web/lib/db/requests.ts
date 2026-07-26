"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  CollectionRequest,
  RequestItems,
  PickupInfo,
  RequestStatus,
} from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";

import { mapRequest, type RequestRow } from "./types";

export async function fetchAllRequests(): Promise<CollectionRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as RequestRow[]).map(mapRequest);
}

export async function fetchRequestsByCompany(
  companyId: string | null
): Promise<CollectionRequest[]> {
  if (!companyId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as RequestRow[]).map(mapRequest);
}

/** display_no(REQ-2026-0001) 또는 internal uuid 둘 다 허용 */
export async function fetchRequest(
  identifier: string
): Promise<CollectionRequest | null> {
  const supabase = createClient();
  const column = identifier.startsWith("REQ-") ? "display_no" : "id";
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq(column, identifier)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRequest(data as RequestRow) : null;
}

export async function createRequest(input: {
  companyId: string;
  createdBy: string | null;
  items: RequestItems;
  pickup: PickupInfo;
}): Promise<CollectionRequest> {
  const supabase = createClient();
  const payload = {
    company_id: input.companyId,
    created_by: input.createdBy,
    items_quantity: input.items.quantity,
    items_manufacturer: input.items.manufacturer,
    items_age: input.items.age,
    items_os: input.items.os,
    items_note: input.items.note ?? null,
    pickup_date: input.pickup.date,
    pickup_time_slot: input.pickup.timeSlot,
    pickup_address: input.pickup.address,
    pickup_request: input.pickup.request ?? null,
  };
  const { data, error } = await supabase
    .from("requests")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapRequest(data as RequestRow);
}

export async function setRequestStatus(
  displayNo: string,
  status: RequestStatus
): Promise<CollectionRequest | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requests")
    .update({ status })
    .eq("display_no", displayNo)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapRequest(data as RequestRow) : null;
}

export async function advanceRequest(
  displayNo: string
): Promise<CollectionRequest | null> {
  const current = await fetchRequest(displayNo);
  if (!current) return null;
  const idx = STATUS_ORDER.indexOf(current.status);
  if (idx >= STATUS_ORDER.length - 1) return current;
  return setRequestStatus(displayNo, STATUS_ORDER[idx + 1]);
}

export function statusReached(
  status: RequestStatus,
  target: RequestStatus
): boolean {
  return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(target);
}
