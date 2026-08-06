"use client";

/**
 * 히어로 분해도 — 폐PC 한 대가 부품으로 흩어지고, 각각에 회수 가치가 붙는다.
 *
 * 이 페이지가 설득해야 하는 건 "5,000원짜리 고철이 아니다"는 한 문장이고,
 * 그건 말보다 명세로 보이는 편이 빠르다. 그래서 부품별 금액을 전부 적고
 * 합계까지 노출한다 — 합계는 부품값의 합이라 검산이 가능하다.
 *
 * 색 규칙: 초록은 "되살아난 값"(금액)에만, 파랑은 "삭제"에만 쓴다.
 * 나머지는 전부 무채색 도면선이다.
 */

const HUB = { x: 178, y: 262 };
const COL_X = 268;
const DOT_END = 410;
const LABEL_X = 422;
const RIGHT = 578;
const CASE = { x: 28, y: 122, w: 150, h: 280 };

interface Part {
  id: string;
  cy: number;
  w: number;
  h: number;
  model: string;
  /** 콜아웃 둘째 줄 — 금액이거나 처리 표시 */
  sub: string;
  tone: "revive" | "erase";
}

const PARTS: Part[] = [
  { id: "ssd", cy: 70, w: 104, h: 20, model: "NVMe SSD 512GB", sub: "DoD 5220.22-M 삭제", tone: "erase" },
  { id: "ram", cy: 166, w: 118, h: 26, model: "DDR4 16GB", sub: "+32,000원", tone: "revive" },
  { id: "cpu", cy: 262, w: 58, h: 58, model: "Ryzen 5 5600", sub: "+68,000원", tone: "revive" },
  { id: "gpu", cy: 358, w: 132, h: 46, model: "GTX 1660 Super", sub: "+95,000원", tone: "revive" },
  { id: "psu", cy: 454, w: 86, h: 54, model: "500W 파워", sub: "+12,000원", tone: "revive" },
];

const LINE = "var(--border-strong)";
const DETAIL = "rgba(255,255,255,0.16)";
const BODY = "var(--card)";

/** 부품 실루엣 — 사진 대신 도면 심볼로 통일한다 */
function PartShape({ part }: { part: Part }) {
  const x = COL_X;
  const y = part.cy - part.h / 2;
  const base = { fill: BODY, stroke: LINE, strokeWidth: 1.25 };

  switch (part.id) {
    case "ssd":
      return (
        <>
          <rect x={x} y={y} width={part.w} height={part.h} rx={2} {...base} />
          <rect x={x + 34} y={y + 4} width={54} height={12} fill="none" stroke={DETAIL} />
          <rect x={x + 96} y={y + 6} width={4} height={8} fill={DETAIL} />
          {[6, 10, 14, 18, 22].map((d) => (
            <line key={d} x1={x + d} y1={y + 13} x2={x + d} y2={y + part.h} stroke={DETAIL} />
          ))}
        </>
      );
    case "ram":
      return (
        <>
          <rect x={x} y={y} width={part.w} height={part.h} rx={1.5} {...base} />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={x + 7 + i * 13.4} y={y + 5} width={10} height={11} fill="none" stroke={DETAIL} />
          ))}
          <rect x={x + 48} y={y + part.h - 4} width={9} height={4} fill="var(--background)" />
          <line x1={x + 5} y1={y + part.h - 2} x2={x + 113} y2={y + part.h - 2} stroke={DETAIL} strokeDasharray="2 3" />
        </>
      );
    case "cpu":
      return (
        <>
          <rect x={x} y={y} width={part.w} height={part.h} rx={2} {...base} />
          <path d={`M ${x + 5} ${y + 13} L ${x + 5} ${y + 5} L ${x + 13} ${y + 5}`} fill="none" stroke={DETAIL} strokeWidth={1.5} />
          <rect x={x + 10} y={y + 10} width={38} height={38} rx={1} fill="none" stroke={DETAIL} />
          <line x1={x + 10} y1={y + 29} x2={x + 48} y2={y + 29} stroke={DETAIL} strokeDasharray="2 4" />
        </>
      );
    case "gpu":
      return (
        <>
          <rect x={x} y={y - 5} width={7} height={part.h + 10} rx={1} fill={BODY} stroke={LINE} />
          <rect x={x + 7} y={y} width={part.w - 7} height={part.h} rx={2} {...base} />
          {[46, 96].map((cx) => (
            <g key={cx}>
              <circle cx={x + cx} cy={y + part.h / 2} r={15} fill="none" stroke={DETAIL} />
              <circle cx={x + cx} cy={y + part.h / 2} r={4} fill={DETAIL} />
            </g>
          ))}
          <rect x={x + 34} y={y + part.h} width={66} height={5} fill={DETAIL} />
        </>
      );
    default:
      return (
        <>
          <rect x={x} y={y} width={part.w} height={part.h} rx={2} {...base} />
          <circle cx={x + 42} cy={y + 27} r={19} fill="none" stroke={DETAIL} />
          <circle cx={x + 42} cy={y + 27} r={11} fill="none" stroke={DETAIL} strokeDasharray="2 3" />
          <circle cx={x + 42} cy={y + 27} r={4} fill={DETAIL} />
          <rect x={x + 68} y={y + 8} width={11} height={9} fill="none" stroke={DETAIL} />
        </>
      );
  }
}

export function ExplodedDiagram() {
  return (
    <>
      {/* 데스크톱 — 분해도 */}
      <svg
        viewBox="0 0 600 590"
        className="hidden h-auto w-full lg:block"
        role="img"
        aria-label="폐PC 한 대의 분해 명세. SSD는 DoD 5220.22-M으로 삭제하고, 메모리·CPU·그래픽카드·파워는 검증 후 회수해 합계 207,000원의 가치를 되찾습니다."
      >
        {/* 본체 — 부품이 빠져나간 자리. 빈 슬롯을 점선으로 남겨
            "이것들이 여기서 나왔다"를 지시선 없이도 읽히게 한다 */}
        <g stroke="var(--border)" fill="none" strokeWidth={1.25}>
          <rect x={CASE.x} y={CASE.y} width={CASE.w} height={CASE.h} rx={4} fill={BODY} />
          <circle cx={CASE.x + 122} cy={CASE.y + 20} r={4} />
          {[36, 44, 52].map((d) => (
            <line key={d} x1={CASE.x + 20} y1={CASE.y + d} x2={CASE.x + 74} y2={CASE.y + d} />
          ))}
        </g>
        <g stroke="var(--border-strong)" fill="none" strokeWidth={1} strokeDasharray="3 4" opacity={0.55}>
          <rect x={CASE.x + 88} y={CASE.y + 74} width={44} height={11} rx={1} />
          {[0, 1].map((i) => (
            <rect key={i} x={CASE.x + 84} y={CASE.y + 100 + i * 12} width={48} height={7} rx={1} />
          ))}
          <rect x={CASE.x + 26} y={CASE.y + 92} width={42} height={42} rx={1} />
          <rect x={CASE.x + 22} y={CASE.y + 160} width={110} height={28} rx={1} />
          <rect x={CASE.x + 26} y={CASE.y + 212} width={98} height={50} rx={1} />
        </g>
        <text
          x={CASE.x + CASE.w / 2}
          y={CASE.y + CASE.h + 26}
          textAnchor="middle"
          className="fill-[var(--text-muted)] font-mono"
          fontSize={11.5}
        >
          본체 1대 · 부품 반출
        </text>

        {PARTS.map((p, i) => {
          const partDelay = 140 + i * 95;
          const tone = p.tone === "revive" ? "var(--primary)" : "var(--status-wiping)";
          return (
            <g key={p.id}>
              {/* 지시선 — 본체에서 부품이 나온 경로 */}
              <path
                className="wj-leader"
                style={{ animationDelay: `${partDelay + 210}ms` }}
                d={`M ${HUB.x} ${HUB.y} L ${236} ${p.cy} L ${COL_X - 6} ${p.cy}`}
                fill="none"
                stroke={LINE}
                strokeWidth={1}
                pathLength={1}
                strokeDasharray={1}
              />

              <g
                className="wj-part"
                style={
                  {
                    "--wj-dx": -90,
                    "--wj-dy": HUB.y - p.cy,
                    animationDelay: `${partDelay}ms`,
                  } as React.CSSProperties
                }
              >
                <PartShape part={p} />
              </g>

              {/* 콜아웃 — 점선으로 부품과 라벨을 잇는다 */}
              <g className="wj-callout" style={{ animationDelay: `${partDelay + 430}ms` }}>
                <line
                  x1={COL_X + p.w + 6}
                  y1={p.cy}
                  x2={DOT_END}
                  y2={p.cy}
                  stroke={LINE}
                  strokeWidth={1}
                  strokeDasharray="1.5 4"
                />
                <circle cx={DOT_END} cy={p.cy} r={2} fill={LINE} />
                <text x={LABEL_X} y={p.cy - 3} className="fill-[var(--foreground)] font-mono" fontSize={12.5}>
                  {p.model}
                </text>
                <text x={LABEL_X} y={p.cy + 15} className="font-mono" fontSize={11.5} fill={tone}>
                  {p.sub}
                </text>
              </g>
            </g>
          );
        })}

        {/* 합계 — 부품값의 합이라 검산이 된다 */}
        <g className="wj-callout" style={{ animationDelay: "1000ms" }}>
          <line x1={COL_X} y1={508} x2={RIGHT} y2={508} stroke="var(--border)" />
          <text x={COL_X} y={531} className="fill-[var(--text-muted)] font-mono" fontSize={11.5}>
            고물상 처리 시
          </text>
          <text
            x={RIGHT}
            y={531}
            textAnchor="end"
            className="fill-[var(--text-muted)] font-mono"
            fontSize={11.5}
            textDecoration="line-through"
          >
            5,000원
          </text>
          <text x={COL_X} y={566} className="fill-[var(--foreground)]" fontSize={13} fontWeight={700}>
            우주딜러 회수 가치
          </text>
          <text
            x={RIGHT}
            y={570}
            textAnchor="end"
            className="fill-[var(--primary)] font-mono"
            fontSize={27}
            fontWeight={800}
          >
            207,000원
          </text>
        </g>
      </svg>

      {/* 모바일 — 같은 명세를 목록으로 */}
      <div className="rounded-xl border border-border bg-card lg:hidden">
        <div className="flex items-baseline justify-between border-b border-border px-5 py-3.5">
          <span className="font-mono text-[12px] text-text-muted">처리 명세 · 폐PC 1대</span>
          <span className="font-mono text-[12px] text-text-muted">1/1</span>
        </div>
        <ul className="divide-y divide-border/60">
          {PARTS.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-mono text-foreground">{p.model}</span>
              <span
                className={`shrink-0 font-mono text-[12px] ${
                  p.tone === "revive" ? "text-primary" : "text-status-wiping"
                }`}
              >
                {p.sub}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-text-muted">고물상 처리 시</span>
            <span className="font-mono text-text-muted line-through">5,000원</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[13px] font-bold text-foreground">우주딜러 회수 가치</span>
            <span className="font-mono text-[24px] font-extrabold text-primary">207,000원</span>
          </div>
        </div>
      </div>
    </>
  );
}
