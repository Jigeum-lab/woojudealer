"use client";

/**
 * 구매 히어로 하단 띠 — 실제 재고 부품을 한 줄로 보여준다.
 *
 * 처음에는 배경 전체를 부품 타일로 덮었는데, 흰 상자가 화면을 가득 채우니
 * 지저분하고 글자도 죽었다. 배경은 비우고 아래 한 줄만 남긴다.
 * "이런 걸 판다"는 신호로 충분하고, 제품은 아래 추천 사양 카드가 크게 보여준다.
 *
 * 사진은 고정 목록이다. 히어로는 첫 화면이라 DB를 기다릴 수 없고,
 * /wooju/parts 아래 정적 파일(장당 10KB 안팎)이라 바로 뜬다.
 */

/** 분류별로 한눈에 알아보는 것들 — 파일명이 부품 고유번호다 */
const TILES = [
  100052, // 케이스
  80030, // 그래픽카드
  190012, // 모니터
  40002, // 마더보드
  90026, // 파워
  110042, // CPU쿨러
  30002, // CPU
  150010, // 키보드
  60014, // SSD
  180002, // 헤드셋
  50018, // 메모리
  160006, // 마우스
  120010, // 케이스팬
  170003, // 스피커
];

const TILE = 92;

export function PartStrip() {
  // 넓은 화면에서 끊기지 않게 두 벌 잇는다
  const tiles = [...TILES, ...TILES];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden">
      <div
        className="flex justify-center gap-3 px-3 pb-6"
        // 양끝을 흐려 배경으로 가라앉힌다 — 잘린 단면이 그대로 보이면 지저분하다
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        {tiles.map((no, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white/85"
            style={{ width: TILE, height: TILE }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/wooju/parts/${no}.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-contain p-1.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
