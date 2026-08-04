"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Plus;
}

interface NavGroup {
  /** 그룹 라벨 — 관리자처럼 성격이 다른 메뉴 묶음을 시각 분리할 때만 */
  label?: string;
  items: NavItem[];
}

// 고객은 수거·정산 플로우만 본다. 견적·재고 ERP는 내부(관리자) 전용.
const COMPANY_NAV: NavGroup[] = [
  {
    items: [
      { href: "/requests/new", label: "수거 신청", icon: Plus },
      { href: "/requests", label: "내 신청", icon: ClipboardList },
      { href: "/dashboard", label: "ESG 대시보드", icon: BarChart3 },
      { href: "/settlements", label: "정산 내역", icon: Wallet },
    ],
  },
];

const PUBLIC_NAV: NavGroup[] = [
  {
    items: [
      { href: "/requests/new", label: "수거 신청", icon: Plus },
      { href: "/requests", label: "내 신청", icon: ClipboardList },
      { href: "/dashboard", label: "ESG 대시보드", icon: BarChart3 },
      { href: "/support", label: "FAQ", icon: HelpCircle },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: "수거 운영",
    items: [
      { href: "/admin", label: "관리자", icon: ShieldCheck },
      { href: "/settlements", label: "정산 관리", icon: Wallet },
    ],
  },
  {
    label: "견적·재고 ERP",
    items: [
      { href: "/quotes", label: "견적", icon: Calculator },
      { href: "/admin/parts", label: "부품·재고", icon: Boxes },
    ],
  },
];

export function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav =
    user?.role === "admin" ? ADMIN_NAV : user ? COMPANY_NAV : PUBLIC_NAV;

  function handleLogout() {
    logout();
    router.push("/");
    setMobileOpen(false);
  }

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : href === "/admin"
        ? // /admin/parts는 별도 메뉴라 관리자 탭이 같이 켜지지 않게 정확 일치
          pathname === "/admin"
        : pathname.startsWith(href);

  const initials = user?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 md:px-10">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/wooju/logo.svg"
            alt="우주딜러"
            width={74}
            height={28}
            priority
            className="h-6 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {nav.map((group, gi) => (
            <div key={group.label ?? gi} className="flex items-center gap-0.5">
              {gi > 0 && (
                <span
                  aria-hidden
                  className="mx-2 h-4 w-px shrink-0 bg-border-strong"
                />
              )}
              {group.label && (
                <span className="mr-1 hidden text-[11px] font-semibold tracking-wide text-text-muted lg:inline">
                  {group.label}
                </span>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  // 인증 상태가 세션→프로필→회사 3단계로 확정되며 헤더가 여러 번
                  // 재렌더되는데, 그때마다 링크 prefetch가 다시 발생해 로그인 직후
                  // RSC 요청이 30건 가까이 몰렸다. 모두 로그인이 필요한 화면이라
                  // proxy를 거치므로 비용이 크다. 실제 이동 시에만 받는다.
                  prefetch={false}
                  className={cn(
                    "relative rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "text-primary"
                      : "text-text-secondary hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 gap-2 px-2 hover:bg-secondary"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-brand-green-soft text-xs font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href={user.role === "admin" ? "/admin" : "/me"}
                    className="flex items-center gap-2"
                  >
                    <User className="size-4" />
                    내 프로필
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">로그인</Link>
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="메뉴 열기"
        >
          <Menu className="size-5" />
        </Button>
      </div>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle asChild>
              <Link href="/" onClick={() => setMobileOpen(false)}>
                <Image
                  src="/wooju/logo.svg"
                  alt="우주딜러"
                  width={74}
                  height={28}
                  className="h-6 w-auto"
                />
              </Link>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="flex flex-col gap-1">
              {nav.map((group, gi) => (
                <div key={group.label ?? gi} className="flex flex-col gap-1">
                  {gi > 0 && <div className="my-2 h-px bg-border" />}
                  {group.label && (
                    <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-text-muted">
                      {group.label}
                    </div>
                  )}
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-brand-green-soft text-primary"
                          : "text-text-secondary hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </nav>

          <div className="border-t border-border px-3 py-4">
            {user ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-brand-green-soft text-xs font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {user.name}
                    </div>
                    <div className="truncate text-xs text-text-muted">
                      {user.email}
                    </div>
                  </div>
                </div>
                <Link
                  href={user.role === "admin" ? "/admin" : "/me"}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <User className="size-4 shrink-0" />
                  내 프로필
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4 shrink-0" />
                  로그아웃
                </button>
              </div>
            ) : (
              <Button asChild className="w-full">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  로그인
                </Link>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
