-- 견적·재고 시스템 (우주시스템 견적서 ver.8.0.2 엑셀의 웹 이식)
--
-- 엑셀 구조와의 대응:
--   부품단가 시트(23개 카테고리 블록, ~700품목) → parts + inventory
--   견적양식 시트(AMD/INTEL 2열, 21개 슬롯)     → quotes + quote_items
--   AMD/INTEL 출력폼·거래명세서                  → quotes를 렌더링한 결과물
--   추천사양 템플릿                              → quote_templates + quote_template_items
--
-- 카테고리별로 스펙 컬럼이 제각각이라(CPU=코어/클럭/캐시, 케이스=GPU허용/쿨러허용 …)
-- 공통 컬럼만 정규화하고 나머지는 specs jsonb에 담는다.

-- =====================================================
-- 1. 열거형
-- =====================================================

-- 견적서 슬롯 순서와 1:1 (엑셀 견적양식 시트의 행 순서)
create type public.part_category as enum (
  'cpu',
  'mainboard',
  'memory',
  'ssd',
  'hdd',
  'gpu',
  'psu',
  'case',
  'cpu_cooler',
  'case_fan',
  'rgb_controller',
  'ssd_heatsink',
  'memory_heatsink',
  'tuning',
  'labor_as',
  'keyboard',
  'mouse',
  'speaker',
  'headset',
  'monitor',
  'extra'
);

-- CPU·마더보드만 플랫폼을 타고, 나머지는 공용이다.
create type public.part_platform as enum ('amd', 'intel', 'common');

-- =====================================================
-- 2. parts (부품단가 = 엑셀 1번 시트)
-- =====================================================
create table public.parts (
  id          uuid primary key default gen_random_uuid(),
  -- 엑셀 "고유번호" (CPU 10000~, 마더보드 20000~ …). 임포트 재실행 시 upsert 키.
  part_no     integer not null unique,
  category    public.part_category not null,
  platform    public.part_platform not null default 'common',
  name        text    not null,
  price       integer not null default 0 check (price >= 0),
  -- 엑셀 "품절여부" 컬럼. 재고와 별개로 공급사 품절을 표시한다.
  sold_out    boolean not null default false,
  -- 엑셀 "등급" 컬럼 (RC_A ~ RC_F). 추천사양 구성의 기준값.
  grade       text,
  link        text,
  -- 카테고리별 스펙. 예) cpu: {"cores":"6/12","clock":"3.5~4.4","cache":"35","memory":"DDR4"}
  --                    case: {"gpu_max_mm":360,"cooler_max_mm":170}
  specs       jsonb   not null default '{}'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index parts_category_idx  on public.parts(category);
create index parts_platform_idx  on public.parts(platform);
create index parts_active_idx    on public.parts(active) where active;
create index parts_specs_gin_idx on public.parts using gin(specs);

create trigger before_update_parts_touch
  before update on public.parts
  for each row execute function public.touch_updated_at();

-- =====================================================
-- 3. inventory (재고)
--
-- 통화 요청: "대표님이 재고가 있는지 파악할 수 있는 시스템 만들고
--            재고 기반으로 견적 만들어 주는 거"
-- =====================================================
create table public.inventory (
  part_id    uuid primary key references public.parts(id) on delete cascade,
  quantity   integer not null default 0 check (quantity >= 0),
  location   text,
  note       text,
  updated_at timestamptz not null default now()
);

create trigger before_update_inventory_touch
  before update on public.inventory
  for each row execute function public.touch_updated_at();

-- 재고 있는 부품만 빠르게 뽑기 위한 인덱스
create index inventory_in_stock_idx on public.inventory(part_id) where quantity > 0;

-- =====================================================
-- 4. part_price_history (가격 변동 이력)
--
-- 통화: "그게 지금 작업을 해 보니까 너무 자주 바뀌어 가지고 너무 힘들어서"
-- 일괄 업로드·수동 수정·크롤링 중 어디서 바뀐 값인지 추적한다.
-- =====================================================
create table public.part_price_history (
  id          uuid primary key default gen_random_uuid(),
  part_id     uuid not null references public.parts(id) on delete cascade,
  price       integer not null,
  source      text not null default 'manual'
                check (source in ('manual', 'bulk_upload', 'import', 'crawl')),
  changed_by  uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index part_price_history_part_idx on public.part_price_history(part_id, recorded_at desc);

-- 가격이 실제로 바뀔 때만 이력을 남긴다.
create or replace function public.log_part_price_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price then
    insert into public.part_price_history (part_id, price)
    values (new.id, new.price);
  end if;
  return new;
end;
$$;

create trigger after_parts_price_change
  after insert or update of price on public.parts
  for each row execute function public.log_part_price_change();

-- =====================================================
-- 5. quotes / quote_items (견적서 = 엑셀 2·3·4번 시트)
-- =====================================================
create table public.quotes (
  id            uuid primary key default gen_random_uuid(),
  -- 엑셀 견적번호 형식: 20260701_001
  display_no    text unique,
  platform      public.part_platform not null default 'amd',
  -- 엑셀 "주문자" (예: 황종환센터장님)
  customer_name text not null,
  company_id    uuid references public.companies(id) on delete set null,
  created_by    uuid references public.profiles(id) on delete set null,
  quote_date    date not null default current_date,
  -- 엑셀에 (VAT별도)/(VAT포함) 두 양식이 다 있다.
  vat_included  boolean not null default false,
  -- quote_items 합계 스냅샷 (조회 성능용, 트리거로 갱신)
  total         integer not null default 0,
  status        text not null default 'draft'
                  check (status in ('draft', 'sent', 'ordered', 'canceled')),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index quotes_company_idx on public.quotes(company_id);
create index quotes_status_idx  on public.quotes(status);

create trigger before_update_quotes_touch
  before update on public.quotes
  for each row execute function public.touch_updated_at();

-- 견적번호 자동 생성: {YYYYMMDD}_{001} — 날짜가 바뀌면 번호를 다시 001부터 센다.
create or replace function public.set_quote_display_no()
returns trigger
language plpgsql
as $$
declare
  today_prefix text := to_char(now(), 'YYYYMMDD');
  next_seq     integer;
begin
  if new.display_no is null then
    select coalesce(max(split_part(display_no, '_', 2)::integer), 0) + 1
      into next_seq
      from public.quotes
     where display_no like today_prefix || '\_%';

    new.display_no := today_prefix || '_' || lpad(next_seq::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger before_insert_quote_display_no
  before insert on public.quotes
  for each row execute function public.set_quote_display_no();

create table public.quote_items (
  id         uuid primary key default gen_random_uuid(),
  quote_id   uuid not null references public.quotes(id) on delete cascade,
  category   public.part_category not null,
  -- 부품이 나중에 삭제돼도 견적서는 남아야 하므로 set null + 이름/가격 스냅샷.
  part_id    uuid references public.parts(id) on delete set null,
  name       text    not null,
  unit_price integer not null default 0,
  quantity   integer not null default 1 check (quantity > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index quote_items_quote_idx on public.quote_items(quote_id, sort_order);

-- quotes.total 자동 갱신
create or replace function public.recalc_quote_total()
returns trigger
language plpgsql
as $$
declare
  target uuid := coalesce(new.quote_id, old.quote_id);
begin
  update public.quotes q
     set total = coalesce(
           (select sum(unit_price * quantity)
              from public.quote_items
             where quote_id = target), 0)
   where q.id = target;
  return null;
end;
$$;

create trigger after_quote_items_change
  after insert or update or delete on public.quote_items
  for each row execute function public.recalc_quote_total();

-- =====================================================
-- 6. quote_templates (추천사양)
--
-- 통화: "출전사항 1 2 3 정도 해 가지고 클릭하면" — 미리 짜둔 구성을
--        한 번에 견적으로 펼친다.
-- =====================================================
create table public.quote_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  platform    public.part_platform not null default 'amd',
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger before_update_quote_templates_touch
  before update on public.quote_templates
  for each row execute function public.touch_updated_at();

create table public.quote_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quote_templates(id) on delete cascade,
  category    public.part_category not null,
  part_id     uuid not null references public.parts(id) on delete cascade,
  quantity    integer not null default 1 check (quantity > 0),
  unique (template_id, category)
);

-- =====================================================
-- 7. RLS
--
-- parts·inventory·templates는 로그인 사용자가 읽고(견적을 짜야 하므로),
-- 쓰기는 관리자만. quotes는 본인 회사 것 또는 관리자.
-- =====================================================
alter table public.parts                enable row level security;
alter table public.inventory            enable row level security;
alter table public.part_price_history   enable row level security;
alter table public.quotes               enable row level security;
alter table public.quote_items          enable row level security;
alter table public.quote_templates      enable row level security;
alter table public.quote_template_items enable row level security;

-- parts
create policy "parts_select_authenticated" on public.parts
  for select to authenticated using (true);
create policy "parts_write_admin" on public.parts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- inventory
create policy "inventory_select_authenticated" on public.inventory
  for select to authenticated using (true);
create policy "inventory_write_admin" on public.inventory
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 가격 이력은 관리자만
create policy "price_history_admin" on public.part_price_history
  for select to authenticated using (public.is_admin());

-- 추천사양
create policy "templates_select_authenticated" on public.quote_templates
  for select to authenticated using (true);
create policy "templates_write_admin" on public.quote_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "template_items_select_authenticated" on public.quote_template_items
  for select to authenticated using (true);
create policy "template_items_write_admin" on public.quote_template_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- quotes: 본인이 만든 것 또는 본인 회사 것, 관리자는 전부
create policy "quotes_select_own_or_admin" on public.quotes
  for select to authenticated using (
    created_by = auth.uid()
    or (company_id is not null and company_id = public.current_company_id())
    or public.is_admin()
  );
create policy "quotes_insert_authenticated" on public.quotes
  for insert to authenticated with check (
    created_by = auth.uid() or public.is_admin()
  );
create policy "quotes_update_own_or_admin" on public.quotes
  for update to authenticated using (
    created_by = auth.uid() or public.is_admin()
  );
create policy "quotes_delete_own_or_admin" on public.quotes
  for delete to authenticated using (
    created_by = auth.uid() or public.is_admin()
  );

-- quote_items: 부모 quote의 권한을 따른다
create policy "quote_items_all_via_parent" on public.quote_items
  for all to authenticated
  using (
    exists (
      select 1 from public.quotes q
       where q.id = quote_items.quote_id
         and (q.created_by = auth.uid()
              or (q.company_id is not null and q.company_id = public.current_company_id())
              or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.quotes q
       where q.id = quote_items.quote_id
         and (q.created_by = auth.uid() or public.is_admin())
    )
  );

-- =====================================================
-- 8. GRANT
--
-- 20260729120000에서 service_role 기본 권한을 걸어뒀지만,
-- authenticated는 명시적으로 부여해야 한다(20260727000000에서 anon은 회수됨).
-- =====================================================
grant select on public.parts, public.inventory, public.quote_templates,
                public.quote_template_items
  to authenticated;

grant select, insert, update, delete on public.parts, public.inventory,
                public.quotes, public.quote_items,
                public.quote_templates, public.quote_template_items
  to authenticated;

grant select on public.part_price_history to authenticated;

grant all on public.parts, public.inventory, public.part_price_history,
             public.quotes, public.quote_items,
             public.quote_templates, public.quote_template_items
  to service_role;
