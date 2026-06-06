-- 정산 시스템
-- 수거 요청이 'done' 상태 도달 시 settlement 자동 생성
-- 대당 18만원 기준 (사업계획서 기준)

create table public.settlements (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null unique references public.requests(id) on delete restrict,
  company_id  uuid not null references public.companies(id) on delete restrict,
  amount      integer not null default 0,       -- 원 단위
  status      text not null default 'pending'
                check (status in ('pending', 'processing', 'paid')),
  note        text,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index settlements_company_id_idx on public.settlements(company_id);
create index settlements_status_idx     on public.settlements(status);

create trigger before_update_settlements_touch
  before update on public.settlements
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.settlements enable row level security;

create policy "settlements_select_own_or_admin" on public.settlements
  for select using (
    company_id = public.current_company_id() or public.is_admin()
  );

create policy "settlements_insert_admin_only" on public.settlements
  for insert with check (public.is_admin());

create policy "settlements_update_admin_only" on public.settlements
  for update using (public.is_admin());

-- 'done' 상태 도달 시 settlement 자동 생성 트리거
create or replace function public.create_settlement_on_done()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount integer;
begin
  if (TG_OP = 'UPDATE' and new.status = 'done' and old.status <> 'done')
     or (TG_OP = 'INSERT' and new.status = 'done') then
    v_amount := new.items_quantity * 180000;  -- 대당 18만원
    insert into public.settlements (request_id, company_id, amount)
    values (new.id, new.company_id, v_amount)
    on conflict (request_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger after_request_done_create_settlement
  after insert or update of status on public.requests
  for each row execute function public.create_settlement_on_done();
