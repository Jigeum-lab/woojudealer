import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * 세션 쿠키를 갱신하고 현재 사용자를 돌려준다.
 * role 조회(profiles)는 하지 않는다 — proxy는 모든 요청에서 실행되므로
 * DB 조회는 피하고, 실제 권한 검증은 각 라우트의 서버 레이아웃에서 수행한다.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
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

  // Touch session — refresh access token if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
