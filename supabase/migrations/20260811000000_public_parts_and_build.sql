-- 고객용 견적 구성기 지원
--
-- 1) 공개 부품 목록(public_parts)
--    parts는 authenticated 전용이라 비로그인 구성기가 조회할 수 없다.
--    테이블을 통째로 열지 않고 뷰로 노출 컬럼을 골라 준다.
--    - link(매입처 링크)와 inventory(재고 수량)는 내부 정보라 제외한다.
--    - active=false는 아예 보이지 않는다.
--    뷰는 소유자 권한으로 동작(security_invoker 미설정)하므로 anon도 읽을 수 있다.
--
-- 2) inquiries.build
--    구성기로 담은 사양을 문의에 실어 보낸다. note에 문자열로 밀어넣으면
--    관리자 화면에서 다시 쪼개야 하므로 구조를 유지한다.

create or replace view public.public_parts as
  select
    id,
    part_no,
    category,
    platform,
    name,
    price,
    sold_out,
    grade,
    specs
  from public.parts
  where active = true;

grant select on public.public_parts to anon, authenticated;

comment on view public.public_parts is
  '고객 견적 구성기용 공개 부품 목록. 매입처 링크·재고는 제외한다.';

-- 담은 사양 스냅샷.
-- 예: {"platform":"amd","items":[{"category":"cpu","partNo":10002,"name":"...","price":188000,"qty":1}],"total":410000}
-- 부품 가격은 바뀌므로 제출 시점 값을 그대로 박아둔다(참조가 아니라 스냅샷).
alter table public.inquiries add column if not exists build jsonb;

-- submit_inquiry에 build 인자를 추가한다. 기존 시그니처는 아래에서 정리한다.
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
  p_note            text default null,
  p_build           jsonb default null
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
    quantity, spec_level, purchase_period, purpose, budget_per_unit, note, build
  ) values (
    p_kind, v_company_id, v_uid,
    btrim(p_contact_name), btrim(p_contact_phone), nullif(btrim(p_contact_email), ''),
    nullif(btrim(p_company_name), ''),
    p_quantity, p_spec_level, p_purchase_period, p_purpose, p_budget_per_unit,
    nullif(btrim(p_note), ''), p_build
  )
  returning display_no into v_display_no;

  return v_display_no;
end;
$$;

-- 인자가 11개인 옛 버전을 남겨두면 PostgREST가 어느 쪽을 부를지 모호해진다.
drop function if exists public.submit_inquiry(
  text, text, text, integer, text, text, text, text, text, integer, text
);

revoke all on function public.submit_inquiry(
  text, text, text, integer, text, text, text, text, text, integer, text, jsonb
) from public;
grant execute on function public.submit_inquiry(
  text, text, text, integer, text, text, text, text, text, integer, text, jsonb
) to anon, authenticated;
