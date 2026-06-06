"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type { Company, Provider, Role, User } from "./types";
import { fetchProfile } from "./db/profiles";
import { fetchCompany } from "./db/companies";
import { createClient } from "./supabase/client";
import * as store from "./store";

interface AuthState {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  /** 실제 Supabase 이메일/PW 로그인 */
  signIn: (email: string, password: string) => Promise<void>;
  /** 실제 Supabase 회원가입 */
  signUp: (email: string, password: string, name: string) => Promise<void>;
  /** 데모용 소셜 mock 로그인 */
  login: (provider: Provider) => User;
  /** 데모용 관리자 mock 로그인 */
  loginAsAdmin: () => User;
  logout: () => void;
  refresh: () => void;
  updateCompany: (company: Company) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncFromStore = useCallback(() => {
    const u = store.getSessionUser();
    setUser(u);
    setCompany(u ? store.getCompany(u.companyId) : null);
  }, []);

  const loadFromSupabase = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const profile = await fetchProfile(userId);
        if (!profile) return false;
        setUser(profile);
        if (profile.companyId) {
          const comp = await fetchCompany(profile.companyId);
          setCompany(comp);
        } else {
          setCompany(null);
        }
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await loadFromSupabase(session.user.id);
      } else {
        store.seedIfNeeded();
        syncFromStore();
      }
      setIsLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadFromSupabase(session.user.id);
      } else if (event === "SIGNED_OUT") {
        syncFromStore();
      }
    });

    const handler = () => syncFromStore();
    window.addEventListener("wj:change", handler);
    window.addEventListener("storage", handler);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("wj:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, [loadFromSupabase, syncFromStore]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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

  const login = useCallback(
    (provider: Provider) => {
      const demo = store.getUsers().find((u) => u.id === "u_demo") ?? null;
      const updated: User = demo ?? {
        id: "u_demo",
        email: "demo@example.com",
        name: "홍길동",
        provider,
        companyId: "c1",
        role: "company",
        termsAgreed: true,
      };
      updated.provider = provider;
      store.upsertUser(updated);
      store.setSession(updated.id);
      syncFromStore();
      return updated;
    },
    [syncFromStore]
  );

  const loginAsAdmin = useCallback(() => {
    const admin = store.getUsers().find((u) => u.id === "u_admin")!;
    store.setSession(admin.id);
    syncFromStore();
    return admin;
  }, [syncFromStore]);

  const logout = useCallback(() => {
    const supabase = createClient();
    supabase.auth.signOut().catch(() => {});
    store.setSession(null);
    setUser(null);
    setCompany(null);
  }, []);

  const refresh = useCallback(() => {
    syncFromStore();
  }, [syncFromStore]);

  const updateCompany = useCallback(
    (c: Company) => {
      store.upsertCompany(c);
      syncFromStore();
    },
    [syncFromStore]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isLoading,
        signIn,
        signUp,
        login,
        loginAsAdmin,
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
    authorized:
      !!user && (!requiredRole || user.role === requiredRole),
  };
}
