"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type { User as SupabaseUser } from "@supabase/supabase-js";

import type { Company, Provider, Role, User } from "./types";
import { fetchProfile } from "./db/profiles";
import { fetchCompany } from "./db/companies";
import { createClient } from "./supabase/client";

/**
 * Supabase가 네이티브로 지원하는 소셜 provider.
 *
 * 2026-07-29 현재 로그인 UI는 이메일/비밀번호로 통일되어 있어 이 경로는
 * 화면에서 노출되지 않는다. 배선 자체는 동작하므로, 소셜 로그인을 다시 켤 때
 * 로그인 페이지에 버튼만 붙이면 된다.
 * (네이버는 네이티브 provider가 아니라 커스텀 OIDC 설정이 추가로 필요하다.)
 */
export type OAuthProvider = "google" | "kakao";

/** auth.users.app_metadata.provider → 앱의 Provider 타입 */
function resolveProvider(authUser: SupabaseUser): Provider {
  const raw = authUser.app_metadata?.provider;
  switch (raw) {
    case "google":
    case "kakao":
    case "naver":
      return raw;
    default:
      // Supabase는 이메일/비밀번호 가입을 "email"로 기록한다.
      return "email";
  }
}

interface AuthState {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  /** 이메일/비밀번호 로그인 */
  signIn: (email: string, password: string) => Promise<void>;
  /** 이메일/비밀번호 회원가입 */
  signUp: (email: string, password: string, name: string) => Promise<void>;
  /** 소셜 로그인 (OAuth 리다이렉트) */
  signInWithProvider: (provider: OAuthProvider, next?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 세션에서 프로필·회사 정보를 다시 불러온다 */
  refresh: () => Promise<void>;
  /** 로컬 회사 상태만 갱신 (DB 저장은 호출측에서 수행) */
  updateCompany: (company: Company) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromSupabase = useCallback(async (authUser: SupabaseUser) => {
    try {
      const profile = await fetchProfile(authUser.id);
      if (!profile) {
        setUser(null);
        setCompany(null);
        return;
      }
      // provider는 profiles가 아니라 auth.users의 app_metadata에 있다.
      setUser({ ...profile, provider: resolveProvider(authUser) });
      setCompany(profile.companyId ? await fetchCompany(profile.companyId) : null);
    } catch {
      setUser(null);
      setCompany(null);
    }
  }, []);

  useEffect(() => {
    // 비밀번호 재설정 메일의 복구 토큰은 우리가 지정한 redirectTo가 아니라
    // Supabase의 Site URL(= 홈)로 떨어지는 경우가 있다. 그러면 홈만 뜨고 끝난다.
    // 토큰이 어느 페이지에 떨어지든 재설정 화면으로 넘긴다. 해시를 그대로 달고
    // 가야 그쪽 클라이언트가 세션을 세울 수 있다.
    //
    // onAuthStateChange의 PASSWORD_RECOVERY로는 못 잡는다 — 그 이벤트는
    // 클라이언트 생성 시점의 URL 처리 중에 나가서 리스너를 붙이기 전에 지나간다.
    if (typeof window !== "undefined") {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      if (
        hash.get("type") === "recovery" &&
        window.location.pathname !== "/auth/reset"
      ) {
        window.location.replace(`/auth/reset${window.location.hash}`);
        return;
      }
    }

    const supabase = createClient();
    let active = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active && session?.user) {
        await loadFromSupabase(session.user);
      }
      if (active) setIsLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 위 해시 검사가 주 경로이고 이건 백스톱이다.
      if (event === "PASSWORD_RECOVERY") {
        if (window.location.pathname !== "/auth/reset") {
          window.location.replace("/auth/reset");
        }
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        await loadFromSupabase(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setCompany(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadFromSupabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
    },
    []
  );

  const signInWithProvider = useCallback(
    async (provider: OAuthProvider, next = "/requests") => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    setCompany(null);
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await loadFromSupabase(session.user);
    } else {
      setUser(null);
      setCompany(null);
    }
  }, [loadFromSupabase]);

  const updateCompany = useCallback((c: Company) => setCompany(c), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isLoading,
        signIn,
        signUp,
        signInWithProvider,
        logout,
        refresh,
        updateCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth(requiredRole?: Role) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const returnTo = window.location.pathname + window.location.search;
      router.replace(`/login?return_to=${encodeURIComponent(returnTo)}`);
    } else if (requiredRole && user.role !== requiredRole) {
      router.replace(user.role === "admin" ? "/admin" : "/me");
    }
  }, [user, isLoading, requiredRole, router]);

  return {
    user,
    isLoading,
    authorized: !!user && (!requiredRole || user.role === requiredRole),
  };
}
