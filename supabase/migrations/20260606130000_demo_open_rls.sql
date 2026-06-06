-- PoC 데모 평가 기간용 임시 RLS 완전 개방
-- =====================================================
-- [경고] 이 마이그레이션은 PoC 평가 기간에만 사용합니다.
-- Auth 작업(Task A: Supabase Auth 교체)이 완료되면
-- 이 파일의 anon 전체 허용 정책을 모두 DROP하고
-- init.sql의 원래 정책(본인 회사/관리자 제한)으로 되돌려야 합니다.
-- =====================================================

-- =====================================================
-- companies — 기존 제한 정책 제거 후 anon 전체 허용
-- =====================================================
drop policy if exists "companies_select_own_or_admin"       on public.companies;
drop policy if exists "companies_insert_authenticated"      on public.companies;
drop policy if exists "companies_update_own_or_admin"       on public.companies;

create policy "demo_companies_all_anon" on public.companies
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- =====================================================
-- profiles — 기존 제한 정책 제거 후 anon 전체 허용
-- =====================================================
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own"          on public.profiles;

create policy "demo_profiles_all_anon" on public.profiles
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- =====================================================
-- requests — 기존 제한 정책 제거 후 anon 전체 허용
-- =====================================================
drop policy if exists "requests_select_own_company_or_admin" on public.requests;
drop policy if exists "requests_insert_own_company"          on public.requests;
drop policy if exists "requests_update_admin_only"           on public.requests;

create policy "demo_requests_all_anon" on public.requests
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- =====================================================
-- certificates — 기존 제한 정책 제거 후 anon 전체 허용
-- =====================================================
drop policy if exists "certificates_select_own_or_admin" on public.certificates;

create policy "demo_certificates_all_anon" on public.certificates
  for all
  to anon, authenticated
  using (true)
  with check (true);
