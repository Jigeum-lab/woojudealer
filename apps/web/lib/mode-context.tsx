"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * 사이트 모드 — 우주딜러는 성격이 다른 두 손님을 동시에 받는다.
 *   sell — 폐PC를 처분하려는 기업 담당자 (수거·삭제·증명)
 *   buy  — 되살린 PC를 사려는 사람 (견적·구성)
 *
 * 헤더 토글과 랜딩 본문이 같은 값을 봐야 해서 컨텍스트로 올린다.
 * 페이지를 옮겨도 유지되도록 localStorage에 남긴다.
 */

export type SiteMode = "sell" | "buy";

const KEY = "wj:mode";

interface ModeState {
  mode: SiteMode;
  setMode: (m: SiteMode) => void;
  /** 저장값을 읽기 전에는 true — 첫 렌더에 잘못된 모드가 번쩍이는 걸 막는다 */
  hydrating: boolean;
}

const ModeContext = createContext<ModeState | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  // 서버 렌더와 첫 클라이언트 렌더는 항상 sell로 맞춘다. 저장값을 초기값으로
  // 쓰면 두 결과가 달라져 hydration이 어긋난다.
  const [mode, setModeState] = useState<SiteMode>("sell");
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    try {
      // ?mode=buy 링크가 저장값보다 우선한다 — 보낸 사람 의도가 먼저다
      const fromUrl = new URLSearchParams(window.location.search).get("mode");
      const saved = window.localStorage.getItem(KEY);
      const next = fromUrl === "buy" || fromUrl === "sell" ? fromUrl : saved;
      if (next === "buy" || next === "sell") setModeState(next);
    } catch {
      /* 저장소가 막힌 환경 — 기본값으로 간다 */
    }
    setHydrating(false);
  }, []);

  const setMode = useCallback((m: SiteMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(KEY, m);
    } catch {
      /* 이번 세션에만 유지된다 */
    }
  }, []);

  return (
    <ModeContext.Provider value={{ mode, setMode, hydrating }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeState {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
