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
  /** 구성기가 이 id로 선택을 되살린다 */
  partId: string;
  category: PartCategory;
  name: string;
  price: number;
  /** 정가. 미입력이면 null — 할인 표기를 하지 않는다 */
  listPrice: number | null;
  imageUrl: string | null;
  qty: number;
}

export interface PublicTemplate {
  id: string;
  name: string;
  description: string | null;
  platform: PartPlatform;
  /** 랜딩 탭 라벨. 없으면 "전체" 탭에만 나온다 */
  tag: string | null;
  /** 실판매가 합계 */
  total: number;
  /** 정가 합계. 정가 미입력 부품은 판매가로 대신 더해져 항상 total 이상이다 */
  listTotal: number;
  items: PublicTemplateItem[];
}

interface Row {
  id: string;
  name: string;
  description: string | null;
  platform: PartPlatform;
  tag: string | null;
  total: number;
  list_total: number;
  items: PublicTemplateItem[] | null;
}

/** 정가가 판매가보다 클 때만 할인율(%)을 준다. 아니면 0 — 화면에서 감춘다. */
export function discountRate(total: number, listTotal: number): number {
  if (listTotal <= total || listTotal <= 0) return 0;
  return Math.round(((listTotal - total) / listTotal) * 100);
}

export async function fetchPublicTemplates(): Promise<PublicTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("public_templates")
    .select("id, name, description, platform, tag, total, list_total, items")
    .order("sort_order");
  if (error) throw error;
  return (data as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    platform: r.platform,
    tag: r.tag,
    total: r.total,
    listTotal: r.list_total,
    items: r.items ?? [],
  }));
}
