-- 우주딜러 PoC 초기 스키마
-- - 4개 테이블: companies, profiles, requests, certificates
-- - RLS: 본인 회사 데이터만 접근, 관리자는 전체
-- - 트리거: status='certified' 도달 시 certificate 자동 발급
-- - helper 함수: is_admin(), current_company_id()

create extension if not exists "pgcrypto";

-- =====================================================
-- 1. companies (고객사)
-- =====================================================
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  biz_no      text not null unique,
  contact     text,
  phone       text,
  address     text,
  created_at  timestamptz not null default now()
);

-- =====================================================
-- 2. profiles (사용자 — auth.users와 1:1)
-- =====================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  name          text,
  company_id    uuid references public.companies(id) on delete set null,
  role          text not null default 'company' check (role in ('company','admin')),
  terms_agreed  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 신규 가입 시 profile 자동 생성 (auth.users → profiles 동기화)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- 3. requests (수거 신청)
-- =====================================================
create table public.requests (
  id                  uuid primary key default gen_random_uuid(),
  display_no          text unique,
  company_id          uuid not null references public.companies(id) on delete restrict,
  created_by          uuid references public.profiles(id) on delete set null,
  status              text not null default 'requested'
                        check (status in ('requested','pickup','wiping','certified','done')),
  items_quantity      integer not null check (items_quantity > 0),
  items_manufacturer  text,
  items_age           text,
  items_os            text,
  items_note          text,
  pickup_date         date,
  pickup_time_slot    text,
  pickup_address      text,
  pickup_request      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index requests_company_id_idx on public.requests(company_id);
create index requests_status_idx on public.requests(status);

-- display_no 자동 생성: REQ-{YYYY}-{0001}
create sequence if not exists requests_display_seq start 1;

create or replace function public.set_request_display_no()
returns trigger
language plpgsql
as $$
begin
  if new.display_no is null then
    new.display_no := 'REQ-' || to_char(now(), 'YYYY') || '-' ||
                      lpad(nextval('requests_display_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger before_insert_request_display_no
  before insert on public.requests
  for each row execute function public.set_request_display_no();

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger before_update_requests_touch
  before update on public.requests
  for each row execute function public.touch_updated_at();

-- =====================================================
-- 4. certificates (보안삭제 인증서)
-- =====================================================
create table public.certificates (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null unique references public.requests(id) on delete cascade,
  cert_no     text not null unique,
  dod_method  text not null default 'DoD 5220.22-M',
  pdf_path    text,
  qr_token    text not null unique default encode(gen_random_bytes(16), 'hex'),
  issued_at   timestamptz not null default now()
);

create sequence if not exists certificates_seq start 1;

-- status='certified' 도달 시 certificate 자동 발급
create or replace function public.issue_certificate_on_certified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'UPDATE' and new.status = 'certified' and old.status <> 'certified')
     or (TG_OP = 'INSERT' and new.status in ('certified','done')) then
    insert into public.certificates (request_id, cert_no)
    values (
      new.id,
      'CERT-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('certificates_seq')::text, 5, '0')
    )
    on conflict (request_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger after_request_status_change_issue_cert
  after insert or update of status on public.requests
  for each row execute function public.issue_certificate_on_certified();

-- =====================================================
-- 5. Helper 함수 (RLS용)
-- =====================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- =====================================================
-- 6. RLS 정책
-- =====================================================
alter table public.companies     enable row level security;
alter table public.profiles      enable row level security;
alter table public.requests      enable row level security;
alter table public.certificates  enable row level security;

-- companies
create policy "companies_select_own_or_admin" on public.companies
  for select using (
    id = public.current_company_id() or public.is_admin()
  );

create policy "companies_insert_authenticated" on public.companies
  for insert with check (auth.uid() is not null);

create policy "companies_update_own_or_admin" on public.companies
  for update using (
    id = public.current_company_id() or public.is_admin()
  );

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (
    id = auth.uid() or public.is_admin()
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- requests: 본인 회사 SELECT/INSERT, 관리자만 UPDATE
create policy "requests_select_own_company_or_admin" on public.requests
  for select using (
    company_id = public.current_company_id() or public.is_admin()
  );

create policy "requests_insert_own_company" on public.requests
  for insert with check (
    company_id = public.current_company_id()
  );

create policy "requests_update_admin_only" on public.requests
  for update using (public.is_admin());

-- certificates: 본인 회사 신청건만, 관리자는 전체
create policy "certificates_select_own_or_admin" on public.certificates
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.requests r
      where r.id = certificates.request_id
        and r.company_id = public.current_company_id()
    )
  );
