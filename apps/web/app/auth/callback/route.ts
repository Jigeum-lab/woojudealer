import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth(소셜) 로그인 콜백.
 * provider 인증 후 여기로 리다이렉트되며, code를 세션으로 교환한 뒤 next로 이동한다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/requests";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
