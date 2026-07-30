"use client";

import { createClient } from "@/lib/supabase/client";
import type { PartCategory, PartPlatform } from "@/lib/types";

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  platform: PartPlatform;
  sortOrder: number;
  /** 카테고리 → 부품 id. 견적 화면이 이 id로 선택 상태를 채운다. */
  items: { category: PartCategory; partId: string; quantity: number }[];
}

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  platform: PartPlatform;
  sort_order: number;
  quote_template_items: {
    category: PartCategory;
    part_id: string;
    quantity: number;
  }[];
}

export async function fetchTemplates(): Promise<QuoteTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quote_templates")
    .select("*, quote_template_items(category, part_id, quantity)")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;

  return (data as TemplateRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    platform: row.platform,
    sortOrder: row.sort_order,
    items: (row.quote_template_items ?? []).map((i) => ({
      category: i.category,
      partId: i.part_id,
      quantity: i.quantity,
    })),
  }));
}
