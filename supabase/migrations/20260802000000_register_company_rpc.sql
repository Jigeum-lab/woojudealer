-- 신규 사용자 회사 등록 RPC
--
-- 문제: profiles.company_id를 연결하는 경로가 웹·DB 어디에도 없어
-- 신규 가입자가 회사 등록 → 수거 신청으로 진행할 수 없었다.
-- 클라이언트에서 companies insert 후 자기 profile을 update하는 2단계는
-- RLS(insert 직후 returning select가 본인 회사 조건에 걸림) 때문에 원자적으로 불가.
--
-- 해결: security definer 함수 하나로 회사 생성 + 프로필 연결을 한 트랜잭션에서 수행.
-- 동일 사업자번호가 이미 있으면 합류시키지 않고 BIZ_NO_TAKEN 에러를 던진다
-- (번호만 알면 타사 신청 이력이 보이는 구멍 방지 — 2026-08-02 결정).

create or replace function public.register_company(
  p_name    text,
  p_biz_no  text,
  p_contact text default null,
  p_phone   text default null,
  p_address text default null
) returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_company_id uuid;
  v_row        public.companies;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select company_id into v_company_id
    from public.profiles
   where id = v_uid;

  begin
    if v_company_id is not null then
      -- 이미 연결된 회사가 있으면 그 회사 정보를 수정한다
      update public.companies
         set name    = p_name,
             biz_no  = p_biz_no,
             contact = p_contact,
             phone   = p_phone,
             address = p_address
       where id = v_company_id
       returning * into v_row;
    else
      insert into public.companies (name, biz_no, contact, phone, address)
      values (p_name, p_biz_no, p_contact, p_phone, p_address)
      returning * into v_row;

      update public.profiles
         set company_id = v_row.id
       where id = v_uid;
    end if;
  exception when unique_violation then
    raise exception 'BIZ_NO_TAKEN';
  end;

  return v_row;
end;
$$;

revoke all on function public.register_company(text, text, text, text, text) from public, anon;
grant execute on function public.register_company(text, text, text, text, text) to authenticated;
