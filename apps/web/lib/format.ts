export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

/** 대시보드용 축약 표기 (만원·억원 단위 반올림) */
export function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`;
  if (n >= 10_000) return `${formatNumber(Math.round(n / 10_000))}만원`;
  return `${formatNumber(n)}원`;
}

/** 견적서·거래명세서용 원 단위 정확 표기 — 반올림하지 않는다 */
export function formatWon(n: number): string {
  return `${formatNumber(Math.round(n))}원`;
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}톤`;
  return `${formatNumber(kg)}kg`;
}

const BIZ_NO_RE = /^\d{3}-\d{2}-\d{5}$/;

export function isValidBizNo(value: string): boolean {
  return BIZ_NO_RE.test(value.trim());
}

export function formatBizNo(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const parts = [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 10)].filter(
    Boolean
  );
  return parts.join("-");
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
