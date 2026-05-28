"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { Company, Provider, Role, User } from "./types";
import * as store from "./store";

interface AuthState {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  login: (provider: Provider) => User;
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

  const sync = useCallback(() => {
    const u = store.getSessionUser();
    setUser(u);
    setCompany(u ? store.getCompany(u.companyId) : null);
  }, []);

  useEffect(() => {
    store.seedIfNeeded();
    sync();
    setIsLoading(false);
    const handler = () => sync();
    window.addEventListener("wj:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("wj:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, [sync]);

  const login = useCallback(
    (provider: Provider) => {
      const demo =
        store.getUsers().find((u) => u.id === "u_demo") ?? null;
      const updated: User =
        demo ?? {
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
      sync();
      return updated;
    },
    [sync]
  );

  const loginAsAdmin = useCallback(() => {
    const admin = store.getUsers().find((u) => u.id === "u_admin")!;
    store.setSession(admin.id);
    sync();
    return admin;
  }, [sync]);

  const logout = useCallback(() => {
    store.setSession(null);
    sync();
  }, [sync]);

  const updateCompany = useCallback(
    (c: Company) => {
      store.upsertCompany(c);
      sync();
    },
    [sync]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isLoading,
        login,
        loginAsAdmin,
        logout,
        refresh: sync,
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
      const returnTo =
        window.location.pathname + window.location.search;
      router.replace(`/login?return_to=${encodeURIComponent(returnTo)}`);
    } else if (requiredRole && user.role !== requiredRole) {
      router.replace(user.role === "admin" ? "/admin" : "/me");
    }
  }, [user, isLoading, requiredRole, router]);

  return { user, isLoading, authorized: !!user && (!requiredRole || user.role === requiredRole) };
}
