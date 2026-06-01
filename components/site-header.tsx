"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMPANY_NAV = [
  { href: "/requests/new", label: "수거 신청" },
  { href: "/requests", label: "내 신청" },
  { href: "/dashboard", label: "ESG 대시보드" },
];

const PUBLIC_NAV = [
  { href: "/requests/new", label: "수거 신청" },
  { href: "/requests", label: "내 신청" },
  { href: "/dashboard", label: "ESG 대시보드" },
  { href: "/support", label: "FAQ" },
];

const ADMIN_NAV = [{ href: "/admin", label: "관리자" }];

export function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const nav =
    user?.role === "admin" ? ADMIN_NAV : user ? COMPANY_NAV : PUBLIC_NAV;

  function handleLogout() {
    logout();
    router.push("/");
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/wooju/logo.svg"
            alt="우주딜러"
            width={74}
            height={28}
            priority
            className="h-6 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "font-semibold text-primary"
                  : "text-text-secondary hover:bg-secondary hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}

          {user ? (
            <div className="ml-2 flex items-center gap-1 border-l border-border pl-3">
              <Link
                href={user.role === "admin" ? "/admin" : "/me"}
                className="px-2 py-2 text-sm font-semibold text-foreground hover:text-primary"
              >
                {user.name} 님
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="size-4" />
                로그아웃
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="ml-2">
              <Link href="/login">로그인</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
