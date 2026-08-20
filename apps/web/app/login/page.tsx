import { headers } from "next/headers";

import { LoginForm } from "./login-form";

/**
 * 로그인 화면.
 *
 * 어드민 호스트(admin.woojudealer.com)에서는 폼만 남긴다 — 약관 동의·소셜
 * 로그인·회원가입 링크는 전부 고객 가입 흐름의 것이라 운영자에게는 뜻이 없다.
 *
 * 호스트 판별을 클라이언트에서 하지 않는 것은 하이드레이션 때문이다.
 * window.location으로 가르면 서버는 고객용을, 브라우저는 운영자용을 그려
 * 첫 렌더가 어긋난다. 요청 헤더로 서버에서 정하고 내려보낸다.
 */
export default async function LoginPage() {
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim();
  const host = (await headers()).get("host")?.split(":")[0] ?? "";

  return <LoginForm adminHost={!!adminHost && host === adminHost} />;
}
