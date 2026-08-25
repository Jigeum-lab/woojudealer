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
  list_price: number | null;
  sold_out: boolean;
  grade: string | null;
  link: string | null;
  specs: Record<string, string | number | null> | null;
  image_url: string | null;
  price_checked_at?: string | null;
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
    listPrice: row.list_price,
    soldOut: row.sold_out,
    grade: row.grade,
    link: row.link,
    specs: row.specs ?? {},
    stock: inv ? inv.quantity : null,
    imageUrl: row.image_url,
    priceCheckedAt: row.price_checked_at ?? null,
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
    .select("id, part_no, category, platform, name, price, list_price, sold_out, grade, specs, image_url")
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
  patch: {
    price?: number;
    listPrice?: number | null;
    soldOut?: boolean;
    active?: boolean;
  }
): Promise<void> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.listPrice !== undefined) payload.list_price = patch.listPrice;
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

/**
 * 관리자 — 주어진 부품들의 현재 재고를 한 번에 조회한다.
 *
 * 견적을 주문으로 넘기기 전에 "이 주문을 넣으면 뭐가 모자라는지"를 보여주려는 것.
 * 재고 행이 아예 없는 부품은 0으로 친다(미등록 = 없음).
 */
export async function fetchStockFor(
  partIds: string[]
): Promise<Map<string, number>> {
  if (partIds.length === 0) return new Map();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_status")
    .select("part_id, quantity")
    .in("part_id", partIds);
  if (error) throw error;
  return new Map(
    (data as { part_id: string; quantity: number }[]).map((r) => [
      r.part_id,
      r.quantity,
    ])
  );
}

/* ── 관리자 — 부품 추가·일괄 반영 ────────────────────────────────────────── */

export interface PartUpsertInput {
  partNo?: number | null;
  category: PartCategory;
  platform: PartPlatform;
  name: string;
  price: number;
  listPrice?: number | null;
  soldOut?: boolean;
  grade?: string | null;
  link?: string | null;
}

function toRow(input: PartUpsertInput) {
  return {
    part_no: input.partNo ?? null,
    category: input.category,
    platform: input.platform,
    name: input.name.trim(),
    price: input.price,
    list_price: input.listPrice ?? null,
    sold_out: input.soldOut ?? false,
    grade: input.grade ?? null,
    link: input.link ?? null,
  };
}

/**
 * 부품 추가 (같은 분류·제품명이 이미 있으면 그 행을 갱신한다).
 *
 * 자연키가 (category, name)이라 이름이 겹치면 새 행이 아니라 수정이 된다.
 * 임포트 스크립트와 같은 규칙이므로 엑셀 재반영과 결과가 어긋나지 않는다.
 */
export async function upsertPart(input: PartUpsertInput): Promise<Part> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parts")
    .upsert(toRow(input), { onConflict: "category,name" })
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapPart(data as PartRow);
}

/**
 * CSV 일괄 반영. 신규는 넣고 기존은 고친다.
 *
 * 한 건씩 왕복하면 수백 건에서 느려지므로 한 번에 보낸다. 실패하면 전부
 * 롤백되는 편이 낫다 — 절반만 반영된 단가표는 그대로 견적에 나가기 때문이다.
 */
export async function upsertParts(inputs: PartUpsertInput[]): Promise<number> {
  if (inputs.length === 0) return 0;
  const supabase = createClient();
  const { error } = await supabase
    .from("parts")
    .upsert(inputs.map(toRow), { onConflict: "category,name" });
  if (error) throw error;
  return inputs.length;
}

/* ── 관리자 — 부품 사진 ──────────────────────────────────────────────────── */

const IMAGE_BUCKET = "part-images";

/**
 * 부품 사진 교체.
 *
 * 대표 피드백(2026-08-25): 잘못 매칭된 사진이 많은데 고칠 방법이 없었다.
 * 기존 사진은 레포 안 정적 파일이라 배포를 해야 바뀌었다. Storage에 올려
 * image_url을 갈아끼우면 화면에서 바로 바뀐다.
 *
 * 파일명에 시각을 붙이는 것은 캐시 때문이다. 같은 경로로 덮어쓰면 브라우저·CDN이
 * 옛 사진을 계속 보여줘 "바꿨는데 그대로"가 된다.
 */
export async function uploadPartImage(
  partId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${partId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);

  const { error: updErr } = await supabase
    .from("parts")
    .update({ image_url: publicUrl })
    .eq("id", partId);
  if (updErr) throw updErr;

  return publicUrl;
}

/** 사진 지우기 — 링크만 끊는다. 기존 정적 파일은 다른 부품이 쓸 수 있어 건드리지 않는다 */
export async function clearPartImage(partId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("parts")
    .update({ image_url: null })
    .eq("id", partId);
  if (error) throw error;
}

/**
 * 부품 삭제.
 *
 * 과거 견적서는 영향을 받지 않는다 — quote_items가 이름·단가를 스냅샷으로 들고
 * 있고 part_id만 null이 된다. 다만 추천 PC(quote_template_items)에서는 cascade로
 * 빠지므로, 호출 전에 쓰이는 곳이 있는지 알려주고 확인을 받는다.
 */
export async function deletePart(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("parts").delete().eq("id", id);
  if (error) throw error;
}

/** 이 부품을 쓰는 추천 PC 이름들 — 삭제 전 경고용 */
export async function templatesUsingPart(partId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quote_template_items")
    .select("quote_templates(name)")
    .eq("part_id", partId);
  if (error) throw error;
  // PostgREST는 조인 대상을 배열로 준다(1:1이라도)
  type Row = { quote_templates: { name: string }[] | { name: string } | null };
  return (data as Row[])
    .flatMap((r) => {
      const t = r.quote_templates;
      if (!t) return [];
      return Array.isArray(t) ? t.map((x) => x.name) : [t.name];
    })
    .filter((n): n is string => !!n);
}

/**
 * 부품 수정 — id 기준.
 *
 * upsertPart는 (분류, 제품명) 자연키로 맞추기 때문에 편집 화면에서 이름을 고치면
 * 같은 행을 고치는 대신 새 행이 생긴다. 이미 있는 부품을 고칠 때는 반드시 이쪽을 쓴다.
 */
export async function updatePartDetails(
  id: string,
  input: Partial<PartUpsertInput>
): Promise<Part> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (input.partNo !== undefined) payload.part_no = input.partNo;
  if (input.category !== undefined) payload.category = input.category;
  if (input.platform !== undefined) payload.platform = input.platform;
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.price !== undefined) payload.price = input.price;
  if (input.listPrice !== undefined) payload.list_price = input.listPrice;
  if (input.soldOut !== undefined) payload.sold_out = input.soldOut;
  if (input.grade !== undefined) payload.grade = input.grade;
  if (input.link !== undefined) payload.link = input.link;

  const { data, error } = await supabase
    .from("parts")
    .update(payload)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return mapPart(data as PartRow);
}
