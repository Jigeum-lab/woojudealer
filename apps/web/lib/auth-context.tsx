"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type { Company, Role, User } from "./types";
import { fetchProfile } from "./db/profiles";
import { fetchCompany } from "./db/companies";
import { createClient } from "./supabase/client";

/** Supabase가 네이티브로 지원하는 소셜 provider (naver는 커스텀 OIDC 필요 — 추후) */
export type OAuthProvider = "google" | "kakao";

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

  const loadFromSupabase = useCallback(async (userId: string) => {
    try {
      const profile = await fetchProfile(userId);
      if (!profile) {
        setUser(null);
        setCompany(null);
        return;
      }
      setUser(profile);
      setCompany(profile.companyId ? await fetchCompany(profile.companyId) : null);
    } catch {
      setUser(null);
      setCompany(null);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active && session?.user) {
        await loadFromSupabase(session.user.id);
      }
      if (active) setIsLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadFromSupabase(session.user.id);
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
      await loadFromSupabase(session.user.id);
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
