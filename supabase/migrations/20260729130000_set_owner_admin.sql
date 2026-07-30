-- 운영자 계정 지정
--
-- 통화(2026-07-11) 요청: "어드민 페이지를 다른 사람들은 못 보게 하고,
-- 아이디로 들어가면 어드민이 되게" — 특정 계정만 관리자 권한을 갖게 한다.
--
-- 이미 가입된 계정은 즉시 승격하고, 아직 가입 전이라면 가입 시점에
-- 트리거가 자동으로 admin을 부여한다(재가입·계정 재생성에도 견디도록).

-- 운영자 이메일 목록 (추가 시 여기에만 넣으면 된다)
create or replace function public.is_owner_email(addr text)
returns boolean
language sql
immutable
as $$
  select lower(addr) in (
    'mokujin94@gmail.com'
  );
$$;

-- 1) 이미 가입된 계정 승격
update public.profiles
   set role = 'admin'
 where public.is_owner_email(email)
   and role <> 'admin';

-- 2) 신규 가입 시 자동 부여 — init.sql의 handle_new_user를 확장한다.
--    name 폴백 순서(name → full_name → 이메일 로컬파트)는 원본 그대로 유지하고,
--    role 결정만 추가한다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    case when public.is_owner_email(new.email) then 'admin' else 'company' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
