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

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname, search } = request.nextUrl;
  if (!user && isProtected(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("return_to", pathname + search);
    return NextResponse.redirect(login);
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
