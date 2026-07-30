"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Part,
  PartCategory,
  PartPlatform,
  Quote,
  QuoteItem,
  QuoteStatus,
} from "@/lib/types";
import { CATEGORY_META } from "@/lib/types";

interface QuoteItemRow {
  id: string;
  category: PartCategory;
  part_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  sort_order: number;
}

interface QuoteRow {
  id: string;
  display_no: string;
  platform: PartPlatform;
  customer_name: string;
  company_id: string | null;
  quote_date: string;
  vat_included: boolean;
  total: number;
  status: QuoteStatus;
  note: string | null;
  created_at: string;
  quote_items?: QuoteItemRow[];
}

function mapItem(row: QuoteItemRow): QuoteItem {
  return {
    id: row.id,
    category: row.category,
    partId: row.part_id,
    name: row.name,
    unitPrice: row.unit_price,
    quantity: row.quantity,
  };
}

function mapQuote(row: QuoteRow): Quote {
  const items = (row.quote_items ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(mapItem);
  return {
    id: row.id,
    displayNo: row.display_no,
    platform: row.platform,
    customerName: row.customer_name,
    companyId: row.company_id,
    quoteDate: row.quote_date,
    vatIncluded: row.vat_included,
    total: row.total,
    status: row.status,
    note: row.note,
    items,
    createdAt: row.created_at,
  };
}

const SELECT = "*, quote_items(*)";

export async function fetchQuotes(): Promise<Quote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as QuoteRow[]).map(mapQuote);
}

export async function fetchQuote(id: string): Promise<Quote | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapQuote(data as QuoteRow) : null;
}

export async function fetchQuoteByDisplayNo(displayNo: string): Promise<Quote | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(SELECT)
    .eq("display_no", displayNo)
    .maybeSingle();
  if (error) throw error;
  return data ? mapQuote(data as QuoteRow) : null;
}

export interface CreateQuoteInput {
  platform: PartPlatform;
  customerName: string;
  companyId: string | null;
  createdBy: string | null;
  vatIncluded: boolean;
  note?: string;
  /** 카테고리 → 부품. 비어 있는 슬롯은 견적서에 "0"으로 표시되므로 저장하지 않는다. */
  selection: Partial<Record<PartCategory, Part>>;
  /** 부품별 수량 (미지정 시 1) */
  quantities?: Partial<Record<PartCategory, number>>;
}

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const supabase = createClient();

  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      platform: input.platform,
      customer_name: input.customerName,
      company_id: input.companyId,
      created_by: input.createdBy,
      vat_included: input.vatIncluded,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (quoteError) throw quoteError;

  const quote = quoteData as QuoteRow;

  // 부품명·단가는 스냅샷으로 박아둔다. 나중에 부품 가격이 바뀌어도
  // 이미 발행한 견적서 금액은 그대로여야 하기 때문이다.
  const items = Object.values(input.selection)
    .filter((p): p is Part => Boolean(p))
    .map((part) => ({
      quote_id: quote.id,
      category: part.category,
      part_id: part.id,
      name: part.name,
      unit_price: part.price,
      quantity: input.quantities?.[part.category] ?? 1,
      sort_order: CATEGORY_META[part.category].order,
    }));

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("quote_items").insert(items);
    if (itemsError) {
      // 항목 저장에 실패한 빈 견적서를 남기지 않는다.
      await supabase.from("quotes").delete().eq("id", quote.id);
      throw itemsError;
    }
  }

  const saved = await fetchQuote(quote.id);
  if (!saved) throw new Error("견적서를 저장한 뒤 다시 불러오지 못했습니다");
  return saved;
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteQuote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}
