"use client";

import { createClient } from "@/lib/supabase/client";
import type { PartCategory, PartPlatform } from "@/lib/types";

/**
 * 랜딩용 추천 사양.
 *
 * quote_templates는 로그인 사용자 전용이라 비로그인 방문자가 못 읽는다.
 * public_templates 뷰가 품목·합계를 미리 조립해 주므로 왕복 한 번으로 끝난다.
 */

export interface PublicTemplateItem {
  category: PartCategory;
  name: string;
  price: number;
  imageUrl: string | null;
  qty: number;
}

export interface PublicTemplate {
  id: string;
  name: string;
  description: string | null;
  platform: PartPlatform;
  total: number;
  items: PublicTemplateItem[];
}

interface Row {
  id: string;
  name: string;
  description: string | null;
  platform: PartPlatform;
  total: number;
  items: PublicTemplateItem[] | null;
}

export async function fetchPublicTemplates(): Promise<PublicTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("public_templates")
    .select("id, name, description, platform, total, items")
    .order("sort_order");
  if (error) throw error;
  return (data as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    platform: r.platform,
    total: r.total,
    items: r.items ?? [],
  }));
}
