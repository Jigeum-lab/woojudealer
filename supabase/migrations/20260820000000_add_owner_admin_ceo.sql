-- 운영자 계정 추가 — 우주시스템 대표(우정현)
--
-- admin.woojudealer.com이 열렸는데 정작 운영 콘솔을 쓸 사람이 company 권한이라
-- /me로 튕기고 있었다. is_owner_email 목록에 이메일을 더한다.
--
-- 20260729130000_set_owner_admin.sql이 세운 구조를 그대로 쓴다. 이 함수만 고치면
-- (1) 이미 가입된 계정은 아래 update로 즉시 승격되고
-- (2) 신규 가입은 handle_new_user 트리거가 그 함수를 참조하므로 자동으로 admin이 된다.
--    트리거 본문은 손대지 않는다.

create or replace function public.is_owner_email(addr text)
returns boolean
language sql
immutable
as $$
  select lower(addr) in (
    'mokujin94@gmail.com',
    '153net@paran.com'
  );
$$;

-- 이미 가입된 계정 승격
update public.profiles
   set role = 'admin'
 where public.is_owner_email(email)
   and role <> 'admin';
