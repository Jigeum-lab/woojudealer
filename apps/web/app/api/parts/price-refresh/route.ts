import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  REQUEST_GAP_MS,
  compuzoneProductNo,
  fetchCompuzonePrice,
  sleep,
} from "@/lib/scrape/compuzone";

/**
 * 컴퓨존 현재가를 읽어 부품 단가를 갱신한다.
 *
 * 한 번에 전부 돌리지 않고 화면이 잘라 보낸 묶음만 처리한다. 405건을 한 요청에
 * 몰면 서버리스 실행 시간을 넘기고, 컴퓨존 쪽에도 한꺼번에 몰린다.
 * 순차 + 간격(REQUEST_GAP_MS)으로 훑고, 결과를 그대로 돌려줘 화면이 누적한다.
 *
 * 쓰기는 service role로 한다 — 단가 갱신은 RLS를 타는 사용자 동작이 아니라
 * 운영 배치에 가깝고, price 변경은 DB 트리거가 이력에 남긴다.
 */

/** 한 요청에 처리할 최대 건수 — 실행 시간 한도 안에 들어오게 잡는다 */
const MAX_BATCH = 25;

interface Result {
  id: string;
  name: string;
  before: number;
  after: number | null;
  status: "updated" | "same" | "discontinued" | "unparsable" | "error" | "skipped";
  message?: string;
}

export async function POST(request: Request) {
  // 1) 관리자만
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  // 2) 대상 부품
  let partIds: string[];
  try {
    const body = (await request.json()) as { partIds?: unknown };
    partIds = Array.isArray(body.partIds)
      ? body.partIds.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  if (partIds.length === 0) {
    return NextResponse.json({ error: "대상이 없습니다" }, { status: 400 });
  }
  if (partIds.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `한 번에 ${MAX_BATCH}건까지만 처리합니다` },
      { status: 400 }
    );
  }

  const admin = createServiceClient();
  const { data: parts, error } = await admin
    .from("parts")
    .select("id, name, price, link")
    .in("id", partIds);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3) 순차 조회 — 간격을 두고 훑는다
  const results: Result[] = [];
  const rows = (parts ?? []) as {
    id: string;
    name: string;
    price: number;
    link: string | null;
  }[];

  for (let i = 0; i < rows.length; i++) {
    const part = rows[i];
    const productNo = compuzoneProductNo(part.link);

    if (!productNo) {
      results.push({
        id: part.id,
        name: part.name,
        before: part.price,
        after: null,
        status: "skipped",
        message: "컴퓨존 링크가 아님",
      });
      continue;
    }

    if (i > 0) await sleep(REQUEST_GAP_MS);
    const found = await fetchCompuzonePrice(productNo);

    if (found.status !== "ok") {
      results.push({
        id: part.id,
        name: part.name,
        before: part.price,
        after: null,
        status: found.status,
        message: found.status === "error" ? found.message : undefined,
      });
      continue;
    }

    if (found.price === part.price) {
      results.push({
        id: part.id,
        name: part.name,
        before: part.price,
        after: found.price,
        status: "same",
      });
      continue;
    }

    const { error: upErr } = await admin
      .from("parts")
      .update({ price: found.price })
      .eq("id", part.id);

    results.push({
      id: part.id,
      name: part.name,
      before: part.price,
      after: found.price,
      status: upErr ? "error" : "updated",
      message: upErr?.message,
    });
  }

  return NextResponse.json({ results });
}
