"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  Calculator,
  Inbox,
  LayoutDashboard,
  LogOut,
  MonitorCog,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";

/**
 * 운영 콘솔 껍데기 — 좌측 사이드바 + 상단 바.
 *
 * 고객 헤더(SiteHeader)를 쓰지 않는 이유: 구매/처분 대분류, 견적 짜보기·FAQ 같은
 * 메뉴는 전부 고객 동선이라 운영 화면에서 누를 일이 없다. 화면 위 두 줄을
 * 통째로 잡아먹으면서 정작 운영 메뉴는 본문 카드로 밀려나 있었다.
 *
 * 링크는 짧은 주소(/inquiries)가 아니라 실제 라우트(/admin/inquiries)로 건다.
 * 짧은 주소는 어드민 호스트에서만 성립하는데, 이 껍데기는 호스트와 무관하게
 * 어드민 라우트면 항상 뜨기 때문이다.
 */
const NAV = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/inquiries", label: "견적 문의함", icon: Inbox },
  { href: "/quotes", label: "견적서", icon: Calculator },
  { href: "/admin/parts", label: "부품·재고", icon: Boxes },
  { href: "/admin/templates", label: "추천 PC", icon: MonitorCog },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 어드민 호스트에서는 "/"가 /admin으로 rewrite되지만 주소창은 "/"로 남는다.
  // 그대로 두면 대시보드에 있는데 아무 메뉴도 활성으로 안 보인다.
  const current = pathname === "/" ? "/admin" : pathname;
  const isActive = (href: string) =>
    href === "/admin" ? current === "/admin" : current.startsWith(href);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 상단 바 — 로고와 계정만 */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
            <Image
              src="/wooju/logo.svg"
              alt="우주딜러"
              width={74}
              height={28}
              priority
              className="h-5 w-auto"
            />
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-bold text-text-muted">
              운영 콘솔
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-[13px] text-text-secondary">{user.name}</span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-text-secondary transition-colors hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* 사이드바 — 모바일에서는 가로 스크롤 탭으로 접힌다 */}
        <nav className="shrink-0 border-b border-border md:w-56 md:border-b-0 md:border-r">
          <ul className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:gap-0.5 md:px-3 md:py-4">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href} className="shrink-0 md:shrink">
                  <Link
                    href={href}
                    className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-semibold transition-colors ${
                      active
                        ? "bg-secondary text-foreground"
                        : "text-text-secondary hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`size-4 shrink-0 ${active ? "text-primary" : "text-text-muted"}`}
                    />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
