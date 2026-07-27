-- 실운영 RLS 원복
-- 데모 평가용으로 전면 개방했던 정책(20260606130000_demo_open_rls.sql +
-- 20260608000000_grant_anon_access.sql)을 init.sql의 실운영 정책으로 되돌린다.
--
-- 참고: 공개 QR 인증 페이지(/c/[qr_token])는 service_role(서버)로 조회하므로
--       anon(비로그인) 접근 권한이 필요 없다. → anon은 전면 회수한다.

-- =====================================================
-- 1) 데모 전면개방 정책 제거
-- =====================================================
drop policy if exists "demo_companies_all_anon"    on public.companies;
drop policy if exists "demo_profiles_all_anon"     on public.profiles;
drop policy if exists "demo_requests_all_anon"     on public.requests;
drop policy if exists "demo_certificates_all_anon" on public.certificates;

-- =====================================================
-- 2) anon 역할 전체 접근 회수 (authenticated는 유지 — RLS로 행 제한)
-- =====================================================
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- =====================================================
-- 3) init.sql의 실운영 정책 재생성 (idempotent: 기존 동명 정책 선제거)
-- =====================================================

-- companies: 본인 회사 또는 관리자
drop policy if exists "companies_select_own_or_admin"  on public.companies;
drop policy if exists "companies_insert_authenticated" on public.companies;
drop policy if exists "companies_update_own_or_admin"  on public.companies;

create policy "companies_select_own_or_admin" on public.companies
  for select using (id = public.current_company_id() or public.is_admin());
create policy "companies_insert_authenticated" on public.companies
  for insert with check (auth.uid() is not null);
create policy "companies_update_own_or_admin" on public.companies
  for update using (id = public.current_company_id() or public.is_admin());

-- profiles: 본인 또는 관리자
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own"          on public.profiles;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- requests: 본인 회사 조회/생성, 관리자만 상태 변경
drop policy if exists "requests_select_own_company_or_admin" on public.requests;
drop policy if exists "requests_insert_own_company"          on public.requests;
drop policy if exists "requests_update_admin_only"           on public.requests;

create policy "requests_select_own_company_or_admin" on public.requests
  for select using (company_id = public.current_company_id() or public.is_admin());
create policy "requests_insert_own_company" on public.requests
  for insert with check (company_id = public.current_company_id());
create policy "requests_update_admin_only" on public.requests
  for update using (public.is_admin());

-- certificates: 본인 회사 신청건 또는 관리자 (공개 검증은 service_role)
drop policy if exists "certificates_select_own_or_admin" on public.certificates;

create policy "certificates_select_own_or_admin" on public.certificates
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.requests r
      where r.id = certificates.request_id
        and r.company_id = public.current_company_id()
    )
  );

-- settlements 정책은 20260607100000_add_settlements.sql에서 이미 실운영 기준으로
-- 정의됨(본인/관리자 조회, 관리자만 삽입·수정). anon 회수만으로 충분.
