/**
 * 견적 금액 계산.
 *
 * 엑셀 견적양식은 본체(CPU~튜닝) 소계를 먼저 내고,
 * 공임·주변기기를 더해 "추가품목까지 총 합계"를 따로 낸다. 그 구조를 따른다.
 */

import type { Part, PartCategory, QuoteItem } from "@/lib/types";
import { CATEGORY_META, VAT_RATE } from "@/lib/types";

export interface QuoteTotals {
  /** 본체 견적합계 (CPU ~ 튜닝) */
  core: number;
  /** 공임 & AS */
  service: number;
  /** 주변기기 (키보드 ~ 추가품목) */
  peripheral: number;
  /** 추가품목까지 총 합계 */
  grand: number;
  /** 부가세 (vatIncluded면 grand에 이미 포함된 것으로 보고 역산) */
  vat: number;
  /** 부가세 제외 공급가액 */
  supply: number;
}

interface Line {
  category: PartCategory;
  amount: number;
}

function sumByGroup(lines: Line[]): Pick<QuoteTotals, "core" | "service" | "peripheral"> {
  const acc = { core: 0, service: 0, peripheral: 0 };
  for (const line of lines) {
    acc[CATEGORY_META[line.category].group] += line.amount;
  }
  return acc;
}

function finalize(
  groups: Pick<QuoteTotals, "core" | "service" | "peripheral">,
  vatIncluded: boolean
): QuoteTotals {
  const grand = groups.core + groups.service + groups.peripheral;
  // VAT 포함 금액이면 공급가액을 역산하고, 별도면 위에 얹는다.
  const supply = vatIncluded ? Math.round(grand / (1 + VAT_RATE)) : grand;
  const vat = vatIncluded ? grand - supply : Math.round(grand * VAT_RATE);
  return { ...groups, grand, supply, vat };
}

/** 선택 중인 부품 맵으로 합계 계산 (견적 작성 화면) */
export function totalsFromSelection(
  selection: Partial<Record<PartCategory, Part>>,
  quantities: Partial<Record<PartCategory, number>>,
  vatIncluded: boolean
): QuoteTotals {
  const lines: Line[] = Object.values(selection)
    .filter((p): p is Part => Boolean(p))
    .map((p) => ({
      category: p.category,
      amount: p.price * (quantities[p.category] ?? 1),
    }));
  return finalize(sumByGroup(lines), vatIncluded);
}

/** 저장된 견적서로 합계 계산 (출력·조회 화면) */
export function totalsFromItems(items: QuoteItem[], vatIncluded: boolean): QuoteTotals {
  const lines: Line[] = items.map((i) => ({
    category: i.category,
    amount: i.unitPrice * i.quantity,
  }));
  return finalize(sumByGroup(lines), vatIncluded);
}
