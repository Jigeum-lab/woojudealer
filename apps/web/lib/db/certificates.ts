"use client";

import { createClient } from "@/lib/supabase/client";
import type { Certificate } from "@/lib/types";

import { mapCertificate, type CertificateRow } from "./types";

/** Request의 internal uuid로 certificate 조회 */
export async function fetchCertificateByRequestId(
  requestId: string
): Promise<Certificate | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCertificate(data as CertificateRow) : null;
}

/** display_no 기준 — 두 단계 join */
export async function fetchCertificateByDisplayNo(
  displayNo: string
): Promise<{ cert: Certificate; requestUuid: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("id, certificates(*)")
    .eq("display_no", displayNo)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cert = Array.isArray(data.certificates)
    ? data.certificates[0]
    : data.certificates;
  if (!cert) return null;
  return {
    cert: mapCertificate(cert as CertificateRow),
    requestUuid: data.id,
  };
}

export async function updateCertificatePdfPath(
  certId: string,
  pdfPath: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("certificates")
    .update({ pdf_path: pdfPath })
    .eq("id", certId);
  if (error) throw error;
}
