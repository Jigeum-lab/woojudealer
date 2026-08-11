"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

import { CATEGORY_META, type PartCategory } from "@/lib/types";

/**
 * 부품 사진.
 *
 * 587/695만 사진이 있고(쿨러·케이스팬 일부 누락), 원격 URL이라 실패할 수도 있다.
 * 둘 다 같은 자리를 차지하는 대체 표시로 떨어뜨려 목록이 흔들리지 않게 한다.
 *
 * next/image를 쓰지 않는다 — 목록 한 번에 수십 장이 뜨는데 전부 최적화 서버를
 * 거치면 느리고 비싸다. 원본이 이미 작다(대개 400px 안팎).
 */
export function PartImage({
  src,
  alt,
  category,
  size,
}: {
  src: string | null;
  alt: string;
  category: PartCategory;
  /** 한 변 길이(px). 클래스 대신 인라인으로 둔다 — 썸네일은 정확히 이 크기여야 한다 */
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const box =
    "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background";
  const dim = { width: size, height: size };

  if (!src || failed) {
    return (
      <div className={box} style={dim} aria-hidden>
        <ImageOff className="size-4 text-border-strong" />
        <span className="sr-only">{CATEGORY_META[category].label} 사진 없음</span>
      </div>
    );
  }

  return (
    <div className={box} style={dim}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="size-full object-contain p-1"
      />
    </div>
  );
}
