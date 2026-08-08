-- 견적 요청 접수 (inquiries)
--
-- 수거 신청(requests)은 "가져가 주세요"라 이미 마음을 정한 고객이 쓴다.
-- 그 앞단에 "얼마나 쳐주나요 / 얼마면 사나요"를 묻는 단계가 없어서 만든다.
--
-- 두 방향을 한 테이블에 담고 kind로 구분한다. 담당자 입장에서는 어차피
-- 하나의 문의함이고, 공통 필드(연락처·수량·상태)가 대부분이다.
--   sell_to_us  — 고객이 폐PC를 판다 (우주딜러 매입 견적)
--   buy_from_us — 고객이 재생PC를 산다 (우주딜러 판매 견적)
--
-- 로그인은 요구하지 않는다. 견적 문의는 깔때기 맨 위라 가입을 먼저 시키면
-- 그대로 이탈한다. 대신 anon에게 테이블 권한을 주지 않고 security definer
-- 함수 하나만 열어, 삽입 경로와 검증을 한 곳에 묶는다.

create table public.inquiries (
  id            uuid primary key default gen_random_uuid(),
  display_no    text unique,
  kind          text not null check (kind in ('sell_to_us', 'buy_from_us')),

  -- 로그인 상태로 넣었다면 남기고, 비로그인이면 null
  company_id    uuid references public.companies(id) on delete set null,
  created_by    uuid references public.profiles(id) on delete set null,

  status        text not null default 'new'
                  check (status in ('new', 'contacted', 'quoted', 'closed')),

  contact_name  text not null,
  contact_phone text not null,
  contact_email text,
  company_name  text,

  quantity      integer not null check (quantity > 0 and quantity <= 100000),

  -- sell_to_us: 사양 파악 수준·구입 시기
  spec_level      text,
  purchase_period text,

  -- buy_from_us: 용도·대당 예산(원)
  purpose         text,
  budget_per_unit integer check (budget_per_unit is null or budget_per_unit >= 0),

  note          text,
  admin_memo    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index inquiries_status_idx  on public.inquiries (status, created_at desc);
create index inquiries_company_idx on public.inquiries (company_id);

-- display_no 자동 생성: INQ-{YYYY}-{0001} (requests와 같은 방식)
create sequence if not exists inquiries_display_seq start 1;

create or replace function public.set_inquiry_display_no()
returns trigger
language plpgsql
as $$
begin
  if new.display_no is null then
    new.display_no := 'INQ-' || to_char(now(), 'YYYY') || '-' ||
                      lpad(nextval('inquiries_display_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger before_insert_inquiry_display_no
  before insert on public.inquiries
  for each row execute function public.set_inquiry_display_no();

create trigger touch_inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.touch_updated_at();

-- =====================================================
-- RLS — 직접 삽입은 아무도 못 한다. 접수는 아래 RPC로만.
-- =====================================================
alter table public.inquiries enable row level security;

-- 본인이 남긴 문의 또는 본인 회사 문의, 관리자는 전부
create policy "inquiries_select_own_or_admin" on public.inquiries
  for select to authenticated using (
    created_by = auth.uid()
    or (company_id is not null and company_id = public.current_company_id())
    or public.is_admin()
  );

-- 상태 변경·메모는 관리자만
create policy "inquiries_update_admin" on public.inquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================
-- 접수 RPC — 비로그인도 호출 가능
-- =====================================================
create or replace function public.submit_inquiry(
  p_kind            text,
  p_contact_name    text,
  p_contact_phone   text,
  p_quantity        integer,
  p_contact_email   text default null,
  p_company_name    text default null,
  p_spec_level      text default null,
  p_purchase_period text default null,
  p_purpose         text default null,
  p_budget_per_unit integer default null,
  p_note            text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_company_id uuid;
  v_display_no text;
begin
  if p_kind not in ('sell_to_us', 'buy_from_us') then
    raise exception 'INVALID_KIND';
  end if;
  if coalesce(btrim(p_contact_name), '') = ''
     or coalesce(btrim(p_contact_phone), '') = '' then
    raise exception 'CONTACT_REQUIRED';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 100000 then
    raise exception 'INVALID_QUANTITY';
  end if;

  if v_uid is not null then
    select company_id into v_company_id from public.profiles where id = v_uid;
  end if;

  insert into public.inquiries (
    kind, company_id, created_by,
    contact_name, contact_phone, contact_email, company_name,
    quantity, spec_level, purchase_period, purpose, budget_per_unit, note
  ) values (
    p_kind, v_company_id, v_uid,
    btrim(p_contact_name), btrim(p_contact_phone), nullif(btrim(p_contact_email), ''),
    nullif(btrim(p_company_name), ''),
    p_quantity, p_spec_level, p_purchase_period, p_purpose, p_budget_per_unit,
    nullif(btrim(p_note), '')
  )
  returning display_no into v_display_no;

  -- 접수번호만 돌려준다. 행 전체를 주면 비로그인 호출자에게
  -- RLS를 우회한 조회 통로가 생긴다.
  return v_display_no;
end;
$$;

revoke all on function public.submit_inquiry(
  text, text, text, integer, text, text, text, text, text, integer, text
) from public;
grant execute on function public.submit_inquiry(
  text, text, text, integer, text, text, text, text, text, integer, text
) to anon, authenticated;
