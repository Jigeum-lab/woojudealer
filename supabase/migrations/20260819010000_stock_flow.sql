-- 견적 → 주문 → 재고 차감 연결
--
-- 지금까지 parts·inventory·quotes가 각각 따로 놀았다. 견적을 주문으로 넘겨도
-- 재고는 손으로 고쳐야 했고, 그래서 화면의 재고 수량과 실물이 어긋났다.
-- quotes.status가 'ordered'로 넘어가는 순간 품목만큼 재고에서 빼고, 되돌리면
-- 다시 채운다.
--
-- 왜 원장(inventory_moves)을 따로 두는가: inventory에 수량만 있으면 "왜 줄었나"를
-- 못 되짚는다. 이동을 남겨야 주문 취소 시 정확히 그만큼만 복원할 수 있고,
-- 실물과 어긋났을 때 어디서 벌어졌는지 추적할 수 있다.

-- 1) 재고 음수 허용 -------------------------------------------------------
-- 재고 없는 부품도 주문은 받는다(받아서 매입한다). 음수는 "이만큼 사와야 한다"는
-- 신호로 쓴다. 제약으로 막으면 주문 전환 자체가 실패해 영업이 멈춘다.
alter table public.inventory
  drop constraint if exists inventory_quantity_check;

comment on column public.inventory.quantity is
  '현재 재고. 음수는 부족분(매입 필요)을 뜻한다 — 주문이 재고보다 앞선 상태다.';

-- 2) 재고 이동 원장 -------------------------------------------------------
create table public.inventory_moves (
  id         uuid primary key default gen_random_uuid(),
  part_id    uuid not null references public.parts(id) on delete cascade,
  -- 어떤 견적 때문에 움직였나. 수기 조정이면 null.
  quote_id   uuid references public.quotes(id) on delete set null,
  -- 음수 = 출고(차감), 양수 = 입고(복원·매입)
  delta      integer not null check (delta <> 0),
  reason     text not null
               check (reason in ('order', 'order_canceled', 'manual', 'purchase')),
  note       text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_moves_part_idx on public.inventory_moves (part_id, created_at desc);
create index inventory_moves_quote_idx on public.inventory_moves (quote_id);

comment on table public.inventory_moves is
  '재고 이동 원장. inventory.quantity는 이 이동들의 누적 결과다.';

alter table public.inventory_moves enable row level security;

create policy inventory_moves_admin_all on public.inventory_moves
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3) 재고 적용 함수 -------------------------------------------------------
-- security definer인 것은 의도적이다. 재고 원장은 견적을 누가 넘겼든 항상
-- 같은 결과여야 한다 — 호출자의 RLS에 따라 남기도 하고 안 남기도 하면
-- 장부가 의미를 잃는다. search_path를 고정해 함수 탈취를 막는다.
create or replace function public.apply_quote_stock(
  p_quote_id uuid,
  p_direction integer,   -- -1 = 출고(주문), +1 = 복원(취소)
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
begin
  for item in
    select part_id, sum(quantity)::integer as qty
      from public.quote_items
     where quote_id = p_quote_id and part_id is not null
     group by part_id
  loop
    insert into public.inventory (part_id, quantity)
    values (item.part_id, p_direction * item.qty)
    on conflict (part_id) do update
      set quantity = public.inventory.quantity + (p_direction * item.qty),
          updated_at = now();

    insert into public.inventory_moves (part_id, quote_id, delta, reason, created_by)
    values (item.part_id, p_quote_id, p_direction * item.qty, p_reason, auth.uid());
  end loop;
end;
$$;

-- 4) 상태 전환 트리거 -----------------------------------------------------
create or replace function public.quotes_stock_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 주문으로 넘어감 → 차감
  if new.status = 'ordered' and coalesce(old.status, '') <> 'ordered' then
    perform public.apply_quote_stock(new.id, -1, 'order');

  -- 주문에서 빠짐(취소·되돌림) → 복원
  elsif old.status = 'ordered' and new.status <> 'ordered' then
    perform public.apply_quote_stock(new.id, 1, 'order_canceled');
  end if;

  return new;
end;
$$;

create trigger quotes_stock_sync_trigger
  after update of status on public.quotes
  for each row
  when (old.status is distinct from new.status)
  execute function public.quotes_stock_sync();

comment on function public.quotes_stock_sync is
  'quotes.status가 ordered로 들고 날 때 재고를 차감·복원한다. 품목 수정은 반영하지 않는다 — 주문 확정 후 품목을 바꾸면 주문을 되돌렸다 다시 넘긴다.';

-- 5) 재고 현황 뷰 ---------------------------------------------------------
-- 관리자 화면이 parts와 inventory를 따로 조회해 맞추던 것을 한 번에 준다.
-- 부족분(shortfall)은 화면에서 매입 대상 표시에 쓴다.
create or replace view public.stock_status
with (security_invoker = on) as
  select
    p.id                              as part_id,
    p.part_no,
    p.category,
    p.name,
    p.price,
    p.list_price,
    p.sold_out,
    p.active,
    coalesce(i.quantity, 0)           as quantity,
    greatest(-coalesce(i.quantity, 0), 0) as shortfall,
    i.location,
    i.updated_at
  from public.parts p
  left join public.inventory i on i.part_id = p.id;

grant select on public.stock_status to authenticated;

comment on view public.stock_status is
  '부품 + 재고를 합쳐 보여주는 관리자용 뷰. security_invoker라 조회자의 RLS를 그대로 탄다.';
