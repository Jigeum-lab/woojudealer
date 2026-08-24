/**
 * 컴퓨존 상품 페이지에서 현재 판매가를 읽는다.
 *
 * 부품 단가는 엑셀 임포트 시점 값으로 굳어 있어 시간이 지나면 실제 가격과 벌어진다
 * (확인 예: 9700X 379,000 → 415,000 / 9850X3D 749,510 → 721,000).
 * 대표 요청(2026-08-24)은 매시간이 아니라 주 1~2회 일괄 갱신이다.
 *
 * 다루는 방식에 대해:
 * - robots.txt는 전 경로 Allow이고, 우주시스템이 실제로 매입하는 거래처다.
 * - 예전에 트래픽으로 IP가 차단된 적이 있어(담당자가 해제) 요청은 순차 + 간격을 둔다.
 *   병렬로 몰아치지 않는다.
 * - 페이지는 EUC-KR이다. UTF-8로 읽으면 한글이 깨져 판정이 어긋난다.
 */

/** 상품 페이지 응답을 문자열로 (EUC-KR → UTF-16) */
function decodeEucKr(buf: ArrayBuffer): string {
  return new TextDecoder("euc-kr").decode(buf);
}

export type PriceLookup =
  | { status: "ok"; price: number; title: string | null }
  /** 단종·판매중지 — 가격을 0으로 덮어쓰면 안 되므로 따로 구분한다 */
  | { status: "discontinued" }
  /** 페이지는 받았는데 가격 자리를 못 찾음 — 마크업이 바뀐 경우 */
  | { status: "unparsable" }
  | { status: "error"; message: string };

/** 링크에서 ProductNo를 뽑는다. 컴퓨존 링크가 아니면 null */
export function compuzoneProductNo(link: string | null): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    if (!url.hostname.endsWith("compuzone.co.kr")) return null;
    return url.searchParams.get("ProductNo");
  } catch {
    return null;
  }
}

/**
 * 가격 추출.
 *
 * 가격은 화면에 JS로 그려져서 마크업에는 템플릿만 남는다. 실제 값은 스크립트의
 * produc_price 변수에 들어 있다(컴퓨존 철자 그대로). 이 자리를 못 찾으면 추측하지 않고
 * unparsable로 돌려보낸다 — 틀린 가격이 견적에 그대로 나가는 것보다 낫다.
 */
export function parsePriceFromHtml(html: string): PriceLookup {
  if (html.includes("판매 중인 상품이 아닙니다") || html.includes("main.htm")) {
    if (html.length < 1000) return { status: "discontinued" };
  }

  const m = html.match(/var\s+produc_price\s*=\s*"(\d+)"/);
  if (!m) return { status: "unparsable" };

  const price = Number(m[1]);
  if (!Number.isFinite(price) || price <= 0) return { status: "unparsable" };

  const t = html.match(/<title>([^<]{2,200})<\/title>/);
  return {
    status: "ok",
    price,
    title: t ? t[1].replace(/\s*:\s*컴퓨존\s*$/, "").trim() : null,
  };
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/151.0 Safari/537.36";

export async function fetchCompuzonePrice(
  productNo: string
): Promise<PriceLookup> {
  try {
    const res = await fetch(
      `https://www.compuzone.co.kr/product/product_detail.htm?ProductNo=${encodeURIComponent(productNo)}`,
      {
        headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!res.ok) return { status: "error", message: `HTTP ${res.status}` };
    return parsePriceFromHtml(decodeEucKr(await res.arrayBuffer()));
  } catch (err: unknown) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "요청 실패",
    };
  }
}

export const REQUEST_GAP_MS = 700;

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
