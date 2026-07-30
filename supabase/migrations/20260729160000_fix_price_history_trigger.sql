-- 가격 이력 트리거를 SECURITY DEFINER로 전환
--
-- 증상:
--   관리자가 부품 가격을 수정하면 403.
--   {"code":"42501","message":"permission denied for table part_price_history",
--    "hint":"Grant the required privileges ... GRANT INSERT ON public.part_price_history TO authenticated"}
--
-- 원인:
--   20260729140000에서 만든 log_part_price_change()는 일반 트리거 함수라
--   호출한 사용자(authenticated)의 권한으로 실행된다. 그런데 part_price_history에는
--   authenticated에게 SELECT만 부여했고 RLS도 admin SELECT 정책만 있어서
--   트리거의 INSERT가 거부되고, 그 여파로 parts UPDATE 자체가 실패했다.
--
-- 판단:
--   가격 이력은 사용자가 직접 쓰는 데이터가 아니라 시스템이 남기는 감사 기록이다.
--   authenticated에게 INSERT 권한을 열어주면 사용자가 이력을 위조할 수 있으므로,
--   트리거 함수만 소유자 권한으로 실행되게 한다.

create or replace function public.log_part_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price then
    insert into public.part_price_history (part_id, price, changed_by)
    values (new.id, new.price, auth.uid());
  end if;
  return new;
end;
$$;
