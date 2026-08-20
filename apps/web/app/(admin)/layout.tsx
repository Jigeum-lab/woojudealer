import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin-shell";
import { createClient } from "@/lib/supabase/server";

/**
 * 운영 구역(/admin, /quotes)의 서버사이드 관문 + 껍데기.
 *
 * 전에는 /admin과 /quotes가 각자 같은 내용의 layout을 들고 있었고 둘 다
 * 고객 레이아웃((main)) 안에 있었다. 그래서 운영 화면 위에 구매/처분 대분류와
 * 견적 짜보기·FAQ 같은 고객 메뉴가 그대로 얹혔다. 라우트 그룹을 갈라
 * 관문 하나로 합치고 껍데기도 운영용으로 바꾼다. URL은 그대로다 —
 * 라우트 그룹은 주소에 나타나지 않는다.
 *
 * proxy.ts는 로그인 여부만 optimistic하게 걸러낸다. 실제 role 검증은 여기서
 * 해야 클라이언트 훅을 우회한 직접 접근도 막힌다. 최종 방어선은 DB의
 * RLS(public.is_admin())이며, 이 레이아웃은 그 앞단이다.
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

  return <AdminShell>{children}</AdminShell>;
}
