"use client";

/**
 * 구매 쪽 히어로 배경 — 실제 재고 부품 사진을 진열대처럼 깐다.
 *
 * 처분 쪽은 게이밍 사진 한 장을 전면에 쓰는데, 구매 쪽까지 같은 사진을 쓰니
 * 두 화면이 구분되지 않았다. 여기서는 "무엇을 파는지"가 배경 자체가 된다.
 *
 * 사진은 고정 목록이다. 히어로는 첫 화면이라 DB를 기다릴 수 없고,
 * /wooju/parts 아래 정적 파일(장당 10KB 안팎)이라 바로 뜬다.
 */

/** 분류별로 한눈에 알아보는 것들 — 파일명이 부품 고유번호다 */
const TILES = [
  100052, // 케이스
  80030, // 그래픽카드
  190012, // 모니터
  90026, // 파워
  150010, // 키보드
  110042, // CPU쿨러
  30002, // CPU
  160006, // 마우스
  40002, // 마더보드
  180002, // 헤드셋
  60014, // SSD
  120010, // 케이스팬
  50018, // 메모리
  170003, // 스피커
];

const TILE = 116;
const ROWS = 6;   // 히어로 높이를 채운다 — 모자라면 가운데 띠처럼 보인다
/** 좌우로 넘치게 깔아 화면 끝까지 채운다 — 가운데만 채우면 배경이 아니라 그림이 된다 */
const PER_ROW = 16;

function rowTiles(row: number): number[] {
  return Array.from(
    { length: PER_ROW },
    // 행마다 시작점을 어긋내 같은 사진이 세로로 줄 서지 않게 한다
    (_, i) => TILES[(i + row * 5) % TILES.length]
  );
}

export function PartMosaic() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-background">
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-3"
        style={{ width: PER_ROW * (TILE + 12) }}
      >
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} className="flex gap-3">
            {rowTiles(r).map((no, i) => (
              <div
                key={`${r}-${i}`}
                className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white"
                style={{ width: TILE, height: TILE }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/wooju/parts/${no}.jpg`}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="size-full object-contain p-2"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 제품이 뭔지는 알아볼 만큼만 덮는다. 글자 대비는 가운데 띠에서 챙긴다. */}
      <div className="absolute inset-0 bg-background/55" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.55) 55%, rgba(10,10,10,0) 100%)",
        }}
      />
      {/* 위는 헤더와, 아래는 다음 섹션과 이어지게 */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
}
