import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * 견적·재고 ERP 구역의 서버사이드 관문 (admin/layout.tsx와 동일 패턴).
 *
 * 견적서 발행·부품 단가는 내부 운영 도구라 관리자만 접근한다.
 * 최종 방어선은 DB의 RLS이며, 이 레이아웃은 그 앞단이다.
 */
export default async function QuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?return_to=%2Fquotes");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/me");

  return <>{children}</>;
}
