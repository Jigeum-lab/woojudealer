import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * 관리자 전용 구역의 서버사이드 관문.
 *
 * proxy.ts는 로그인 여부만 optimistic하게 걸러낸다. 실제 role 검증은 여기서
 * 수행해야 클라이언트 훅(useRequireAuth)을 우회한 직접 접근도 막힌다.
 * 최종 방어선은 DB의 RLS(public.is_admin())이며, 이 레이아웃은 그 앞단이다.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?return_to=%2Fadmin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // 프로필이 없거나 관리자가 아니면 일반 사용자 화면으로 돌려보낸다.
  if (profile?.role !== "admin") redirect("/me");

  return <>{children}</>;
}
