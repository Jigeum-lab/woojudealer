"use client";

import { createClient } from "@/lib/supabase/client";
import type { Part, PartCategory, PartPlatform } from "@/lib/types";

export interface PartRow {
  id: string;
  part_no: number | null;
  category: PartCategory;
  platform: PartPlatform;
  name: string;
  price: number;
  sold_out: boolean;
  grade: string | null;
  link: string | null;
  specs: Record<string, string | number | null> | null;
  active: boolean;
  /** inventory 조인 결과 — 재고 미등록이면 빈 배열 */
  inventory?: { quantity: number }[] | { quantity: number } | null;
}

export function mapPart(row: PartRow): Part {
  const inv = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
  return {
    id: row.id,
    partNo: row.part_no,
    category: row.category,
    platform: row.platform,
    name: row.name,
    price: row.price,
    soldOut: row.sold_out,
    grade: row.grade,
    link: row.link,
    specs: row.specs ?? {},
    stock: inv ? inv.quantity : null,
  };
}

const SELECT = "*, inventory(quantity)";

/**
 * 견적 화면에 필요한 부품을 한 번에 가져온다.
 * 695개 전체라 카테고리별로 나눠 부르면 왕복이 21번이 되므로 한 방에 받는다.
 */
export async function fetchAllParts(): Promise<Part[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parts")
    .select(SELECT)
    .eq("active", true)
    .order("category")
    .order("price");
  if (error) throw error;
  return (data as PartRow[]).map(mapPart);
}

/**
 * 고객 견적 구성기용 부품 목록.
 *
 * parts 테이블은 로그인 사용자 전용이라 비로그인 고객이 읽을 수 없다.
 * public_parts 뷰는 매입처 링크와 재고를 뺀 공개 컬럼만 노출한다.
 * 그래서 여기서 돌려주는 Part는 link=null, stock=null이다.
 */
export async function fetchPublicParts(): Promise<Part[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("public_parts")
    .select("id, part_no, category, platform, name, price, sold_out, grade, specs")
    .order("category")
    .order("price");
  if (error) throw error;
  return (data as Omit<PartRow, "link" | "active" | "inventory">[]).map((row) =>
    mapPart({ ...row, link: null, active: true, inventory: null })
  );
}

export async function fetchPartsByCategory(
  category: PartCategory,
  platform?: PartPlatform
): Promise<Part[]> {
  const supabase = createClient();
  let query = supabase
    .from("parts")
    .select(SELECT)
    .eq("active", true)
    .eq("category", category);

  // CPU·마더보드만 플랫폼을 탄다. 공용 부품은 platform='common'.
  if (platform) query = query.in("platform", [platform, "common"]);

  const { data, error } = await query.order("price");
  if (error) throw error;
  return (data as PartRow[]).map(mapPart);
}

/** 관리자 — 가격/품절 수정 */
export async function updatePart(
  id: string,
  patch: { price?: number; soldOut?: boolean; active?: boolean }
): Promise<void> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.soldOut !== undefined) payload.sold_out = patch.soldOut;
  if (patch.active !== undefined) payload.active = patch.active;

  const { error } = await supabase.from("parts").update(payload).eq("id", id);
  if (error) throw error;
}

/** 관리자 — 재고 수량 설정 (없으면 생성) */
export async function setStock(partId: string, quantity: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("inventory")
    .upsert({ part_id: partId, quantity }, { onConflict: "part_id" });
  if (error) throw error;
}
