"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Calculator,
  ClipboardList,
  HelpCircle,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  Recycle,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useMode, type SiteMode } from "@/lib/mode-context";
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

/**
 * 네비는 고객 플로우만 노출한다.
 *
 * 운영 화면(/admin, /admin/parts, /quotes)은 관리자로 로그인해도 메뉴에
 * 띄우지 않는다 — 주소를 직접 입력해 들어간다. 접근 통제는 각 구역의
 * layout(서버) + RLS가 담당하므로, 메뉴를 숨겨도 보안은 그대로다.
 *
 * 모드에 따라 메뉴가 통째로 바뀐다. 처분 쪽 메뉴만 있으면 PC를 사러 온
 * 사람은 갈 곳이 없다.
 */
const NAV: Record<SiteMode, { auth: NavItem[]; guest: NavItem[] }> = {
  sell: {
    auth: [
      { href: "/requests/new", label: "수거 신청", icon: Plus },
      { href: "/requests", label: "내 신청", icon: ClipboardList },
      { href: "/dashboard", label: "ESG 대시보드", icon: BarChart3 },
      { href: "/settlements", label: "정산 내역", icon: Wallet },
    ],
    guest: [
      { href: "/requests/new", label: "수거 신청", icon: Plus },
      { href: "/requests", label: "내 신청", icon: ClipboardList },
      { href: "/dashboard", label: "ESG 대시보드", icon: BarChart3 },
      { href: "/support", label: "FAQ", icon: HelpCircle },
    ],
  },
  buy: {
    auth: [
      { href: "/estimate/pc", label: "견적 짜보기", icon: Calculator },
      { href: "/estimate/buy", label: "견적 요청", icon: ListChecks },
      { href: "/support", label: "FAQ", icon: HelpCircle },
    ],
    guest: [
      { href: "/estimate/pc", label: "견적 짜보기", icon: Calculator },
      { href: "/estimate/buy", label: "견적 요청", icon: ListChecks },
      { href: "/support", label: "FAQ", icon: HelpCircle },
    ],
  },
};

interface NavItem {
  href: string;
  label: string;
  icon: typeof Plus;
}

/**
 * 모드 전환 링크. 헤더 오른쪽 끝에 늘 떠 있다.
 *
 * 플랫폼의 기본은 구매다. 그래서 평소에는 "처분하기"만 보이고,
 * 처분 쪽에 들어가 있을 때만 "구매하기"로 바뀌어 돌아올 길이 된다.
 */
function ModeSwitch({
  mode,
  onChange,
  className,
}: {
  mode: SiteMode;
  onChange: (m: SiteMode) => void;
  className?: string;
}) {
  const next: SiteMode = mode === "buy" ? "sell" : "buy";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-1.5 text-[13px] font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary",
        className
      )}
    >
      {next === "sell" ? (
        <>
          <Recycle className="size-3.5" />
          처분하기
        </>
      ) : (
        <>
          <ShoppingCart className="size-3.5" />
          구매하기
        </>
      )}
    </button>
  );
}

export function SiteHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { mode, setMode } = useMode();
  const nav = user ? NAV[mode].auth : NAV[mode].guest;

  // 랜딩 밖에서 모드를 바꾸면 그 모드의 랜딩으로 보낸다 —
  // 메뉴만 갈리고 화면은 그대로면 뭐가 바뀐 건지 알 수 없다.
  function handleMode(next: SiteMode) {
    setMode(next);
    setMobileOpen(false);
    if (pathname !== "/") router.push(next === "buy" ? "/?mode=buy" : "/");
  }

  function handleLogout() {
    logout();
    router.push("/");
    setMobileOpen(false);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
          {nav.map((item) => (
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
        </nav>

        {/* Desktop right */}
        <div className="hidden items-center gap-3 md:flex">
          <ModeSwitch mode={mode} onChange={handleMode} />
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
                    href="/me"
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

        {/* Mobile: 전환 링크 + 햄버거 */}
        <div className="flex items-center gap-2 md:hidden">
          <ModeSwitch mode={mode} onChange={handleMode} />
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
              {nav.map((item) => (
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
                  href="/me"
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
