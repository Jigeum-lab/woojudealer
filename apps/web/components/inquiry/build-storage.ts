"use client";

import type { PartCategory, PartPlatform } from "@/lib/types";

/**
 * 구성기 선택값을 브라우저에 남긴다.
 *
 * 비로그인으로도 담을 수 있는 화면이라 서버에 둘 자리가 없다. 나갔다 와도
 * 담아둔 게 남아 있어야 해서 localStorage에 둔다.
 *
 * 부품 객체 전체가 아니라 id만 저장한다. 가격·품절은 계속 바뀌므로 다시 들어올 때
 * 현재 목록에서 다시 찾아 맞춘다. 그사이 사라진 부품은 조용히 빠진다.
 */

const KEY = "wj:build:v1";

export interface StoredBuild {
  platform: PartPlatform;
  /** 카테고리 → 부품 id */
  picks: Partial<Record<PartCategory, string>>;
  quantities: Partial<Record<PartCategory, number>>;
}

export function loadBuild(): StoredBuild | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBuild;
    if (!parsed || typeof parsed !== "object" || !parsed.picks) return null;
    return {
      platform: parsed.platform === "intel" ? "intel" : "amd",
      picks: parsed.picks ?? {},
      quantities: parsed.quantities ?? {},
    };
  } catch {
    // 손상됐으면 없는 셈 친다 — 구성기가 못 뜨는 것보다 낫다
    return null;
  }
}

export function saveBuild(build: StoredBuild): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(build));
  } catch {
    // 사파리 프라이빗 모드 등 저장이 막힌 환경 — 이번 세션만 유지된다
  }
}

export function clearBuild(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 지우지 못해도 화면 동작에는 영향 없다 */
  }
}
