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

/* ── 관리자 — 추천 PC 편집 ─────────────────────────────────────────────── */

/** 목록·편집용. fetchTemplates와 달리 비노출(active=false)도 가져온다. */
export interface AdminTemplate extends QuoteTemplate {
  tag: string | null;
  active: boolean;
}

interface AdminTemplateRow extends TemplateRow {
  tag: string | null;
  active: boolean;
}

export async function fetchAllTemplates(): Promise<AdminTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quote_templates")
    .select("*, quote_template_items(category, part_id, quantity)")
    .order("sort_order");
  if (error) throw error;

  return (data as AdminTemplateRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    platform: row.platform,
    tag: row.tag,
    active: row.active,
    sortOrder: row.sort_order,
    items: (row.quote_template_items ?? []).map((i) => ({
      category: i.category,
      partId: i.part_id,
      quantity: i.quantity,
    })),
  }));
}

export async function fetchTemplate(id: string): Promise<AdminTemplate | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quote_templates")
    .select("*, quote_template_items(category, part_id, quantity)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as AdminTemplateRow;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    platform: row.platform,
    tag: row.tag,
    active: row.active,
    sortOrder: row.sort_order,
    items: (row.quote_template_items ?? []).map((i) => ({
      category: i.category,
      partId: i.part_id,
      quantity: i.quantity,
    })),
  };
}

export interface TemplatePatch {
  name?: string;
  description?: string | null;
  platform?: PartPlatform;
  tag?: string | null;
  sortOrder?: number;
  active?: boolean;
}

/** 새 추천 PC. 품목은 비어 있고 노출은 꺼둔 채로 만든다 —
 *  부품을 채우기도 전에 랜딩에 빈 구성이 뜨는 걸 막는다. */
export async function createTemplate(name: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quote_templates")
    .insert({ name, active: false })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateTemplate(
  id: string,
  patch: TemplatePatch
): Promise<void> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.platform !== undefined) payload.platform = patch.platform;
  if (patch.tag !== undefined) payload.tag = patch.tag;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;
  if (patch.active !== undefined) payload.active = patch.active;
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("quote_templates")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("quote_templates").delete().eq("id", id);
  if (error) throw error;
}

/**
 * 카테고리 한 칸을 채운다. (template_id, category)에 unique가 걸려 있어
 * 한 카테고리에는 부품 하나만 들어간다 — 그래서 insert가 아니라 upsert다.
 */
export async function setTemplateItem(
  templateId: string,
  category: PartCategory,
  partId: string,
  quantity = 1
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("quote_template_items")
    .upsert(
      { template_id: templateId, category, part_id: partId, quantity },
      { onConflict: "template_id,category" }
    );
  if (error) throw error;
}

/** 카테고리 한 칸을 비운다 */
export async function removeTemplateItem(
  templateId: string,
  category: PartCategory
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("quote_template_items")
    .delete()
    .eq("template_id", templateId)
    .eq("category", category);
  if (error) throw error;
}
