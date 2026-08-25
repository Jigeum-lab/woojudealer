"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";

import type { Part } from "@/lib/types";
import { PartImage } from "@/components/inquiry/part-image";

/**
 * 부품 사진 칸.
 *
 * 누르면 바로 파일 선택이 열린다 — 잘못 붙은 사진을 한 장씩 갈아끼우는 게 주 용도라
 * 편집 화면을 따로 열지 않고 그 자리에서 끝낸다.
 */
export function PartImageCell({
  part,
  size = 40,
  onPick,
  onClear,
}: {
  part: Part;
  size?: number;
  onPick: (file: File) => void;
  onClear?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="group relative w-fit">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          // 행 클릭(상세 열기)까지 같이 걸리면 사진을 바꾸려다 창이 뜬다
          e.stopPropagation();
          ref.current?.click();
        }}
        title={part.imageUrl ? "눌러서 사진 바꾸기" : "눌러서 사진 넣기"}
        className="block cursor-pointer rounded-md transition-shadow hover:ring-2 hover:ring-primary"
      >
        {part.imageUrl ? (
          <PartImage
            src={part.imageUrl}
            alt={part.name}
            category={part.category}
            size={size}
          />
        ) : (
          <span
            className="flex items-center justify-center rounded-md border border-dashed border-border-strong text-text-muted"
            style={{ width: size, height: size }}
          >
            <ImagePlus className="size-4" />
          </span>
        )}
      </button>
      {part.imageUrl && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={`${part.name} 사진 지우기`}
          title="사진 지우기"
          className="absolute -right-1.5 -top-1.5 hidden size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}
