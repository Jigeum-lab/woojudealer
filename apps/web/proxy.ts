import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * 로그인이 필요한 경로. 미인증 요청은 여기서 /login으로 돌려보낸다.
 * 이는 optimistic 체크일 뿐이다 — role 기반 권한 검증은
 * 각 라우트의 서버 레이아웃(app/(main)/admin/layout.tsx 등)에서 수행한다.
 */
const PROTECTED_PREFIXES = [
  "/admin",
  "/dashboard",
  "/me",
  "/quotes",
  "/requests",
  "/settlements",
];

/**
 * 운영 화면을 어느 호스트에서 서비스할지. 예: "admin.woojudealer.com"
 *
 * 비워두면 지금처럼 고객 사이트의 /admin 경로로 접근한다. DNS가 붙은 뒤에
 * 이 값을 채우면 그때부터 서브도메인으로 갈라진다 — 값이 없는 동안에도
 * 운영이 끊기지 않게 하려는 것이다.
 */
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim();

/** 어드민 호스트에서 짧은 주소로 쓰는 경로 → 실제 라우트 */
const ADMIN_SHORTCUTS: Record<string, string> = {
  "/": "/admin",
  "/inquiries": "/admin/inquiries",
  "/parts": "/admin/parts",
};

/** 어드민 호스트에서 그대로 통과시키는 경로 (이미 최상위 라우트다) */
const ADMIN_PASSTHROUGH = ["/admin", "/quotes", "/login", "/me", "/auth", "/api"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await updateSession(request);

  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const onAdminHost = !!ADMIN_HOST && host === ADMIN_HOST;

  // 어드민 호스트: 짧은 주소를 실제 라우트로 넘긴다. 주소창은 그대로 둔다.
  let rewriteTo: string | null = null;
  if (onAdminHost) {
    const target = ADMIN_SHORTCUTS[pathname];
    if (target) {
      // 인증 검사는 아래에서 '넘어갈 경로' 기준으로 한다 — 그래야 로그인 후
      // /admin이 아니라 원래 보려던 화면으로 돌아온다.
      rewriteTo = target;
    } else if (!startsWithAny(pathname, ADMIN_PASSTHROUGH)) {
      // 어드민 호스트에서 고객 화면(/estimate 등)을 열 이유가 없다
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // 고객 호스트: 어드민 호스트가 준비됐으면 운영 경로를 그쪽으로 넘긴다.
  // 준비 전(ADMIN_HOST 미설정)에는 지금처럼 /admin으로 계속 쓴다.
  if (ADMIN_HOST && !onAdminHost && startsWithAny(pathname, ["/admin", "/quotes"])) {
    return NextResponse.redirect(
      new URL(`https://${ADMIN_HOST}${pathname}${search}`)
    );
  }

  const effectivePath = rewriteTo ?? pathname;
  if (!isAuthenticated && isProtected(effectivePath)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("return_to", effectivePath + search);
    return NextResponse.redirect(login);
  }

  if (rewriteTo) {
    const url = request.nextUrl.clone();
    url.pathname = rewriteTo;
    return NextResponse.rewrite(url, response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip Next.js internals and static assets.
     * Auth cookies refresh on every other request.
     */
    "/((?!_next/static|_next/image|favicon.ico|wooju|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
};
