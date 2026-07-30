"use client";

import { createClient } from "@/lib/supabase/client";
import type { Role, User } from "@/lib/types";

interface ProfileRow {
  id: string;
  email: string;
  name: string | null;
  company_id: string | null;
  role: Role;
  terms_agreed: boolean;
}

export async function fetchProfile(userId: string): Promise<User | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as ProfileRow;
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? row.email.split("@")[0],
    // profiles 테이블에는 provider가 없다. auth-context가 auth.users의
    // app_metadata를 보고 실제 값으로 덮어쓴다.
    provider: "email",
    companyId: row.company_id,
    role: row.role,
    termsAgreed: row.terms_agreed,
  };
}

export async function updateProfile(input: {
  userId: string;
  name?: string;
  companyId?: string | null;
  termsAgreed?: boolean;
}): Promise<void> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.companyId !== undefined) payload.company_id = input.companyId;
  if (input.termsAgreed !== undefined) payload.terms_agreed = input.termsAgreed;

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", input.userId);
  if (error) throw error;
}
