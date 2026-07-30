import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * 세션 쿠키를 갱신하고 로그인 여부를 돌려준다.
 *
 * getUser()가 아니라 getClaims()를 쓴다.
 * getUser()는 JWT마다 Auth 서버로 네트워크 요청을 보내는데, proxy는 모든 요청
 * — Next가 헤더의 네비게이션 링크를 미리 당겨오는 RSC prefetch까지 — 에서
 * 실행되므로 요청당 왕복이 그대로 지연으로 쌓인다. 실제로 로그인 직후
 * prefetch 30여 건이 각 500~750ms씩 걸려 화면이 멈춘 것처럼 보였다.
 *
 * 이 프로젝트는 JWT 서명이 ES256(비대칭키)이라 getClaims()가 WebCrypto로
 * 로컬 검증하고, JWKS만 한 번 받아 캐시한다.
 *
 * role 조회(profiles)는 여기서 하지 않는다. 실제 권한 검증은 각 라우트의
 * 서버 레이아웃에서 수행한다.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; isAuthenticated: boolean }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 만료가 임박했으면 getClaims()가 내부적으로 세션을 먼저 갱신한다.
  const { data } = await supabase.auth.getClaims();

  return { response, isAuthenticated: Boolean(data?.claims?.sub) };
}
