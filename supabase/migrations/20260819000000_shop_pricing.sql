-- 쇼핑몰식 가격 표기 + 추천 PC 탭 분류
--
-- 랜딩의 추천 PC를 "정가 취소선 + 할인율 + 판매가"로 보여주기 위한 최소 스키마.
-- 할인율을 컬럼으로 두지 않는 것은 의도적이다 — 정가와 판매가 둘만 있으면
-- 할인율은 계산으로 나오고, 셋을 두면 서로 어긋난다.
--
-- list_price는 비워둘 수 있다. 비어 있으면 화면에 할인 표기가 아예 없다.
-- 정가를 안 매긴 부품에 가짜 할인율이 붙는 걸 막으려는 것이다.

alter table public.parts
  add column list_price integer
    check (list_price is null or list_price >= 0);

comment on column public.parts.list_price is
  '정가. price(실판매가)보다 클 때만 화면에 취소선·할인율이 표시된다. 비우면 할인 표기 없음.';

-- 추천 PC 탭 분류. 값이 화면 탭 라벨로 그대로 나간다(예: 게임용, 사무용).
-- enum이 아니라 text인 것은 탭 구성이 영업하며 자주 바뀌기 때문이다.
alter table public.quote_templates
  add column tag text;

comment on column public.quote_templates.tag is
  '랜딩 추천 PC의 탭 라벨. 비우면 "전체" 탭에만 나온다.';

-- 공개 뷰 갱신 -----------------------------------------------------------
-- 기존 컬럼·키 이름은 그대로 두고 필요한 것만 더한다. 이름을 바꾸면
-- /estimate/pc 구성기와 랜딩이 같이 깨진다.
--
-- create or replace가 아니라 drop 후 재생성인 것은 Postgres 제약 때문이다 —
-- replace는 기존 컬럼 뒤에 덧붙이는 것만 되고 중간에 끼워 넣지 못한다.
-- 마이그레이션은 트랜잭션 안에서 돌아 조회가 끊기는 구간은 없다.

drop view if exists public.public_parts;
create view public.public_parts as
  select
    id,
    part_no,
    category,
    platform,
    name,
    price,
    list_price,
    sold_out,
    grade,
    specs,
    image_url
  from public.parts
  where active = true;

grant select on public.public_parts to anon, authenticated;

-- 템플릿 뷰: 판매가 합계(total)에 정가 합계(list_total)를 더한다.
-- 정가가 없는 부품은 판매가로 대신 더한다 — 그래야 list_total >= total이
-- 유지되고, 일부 부품에만 정가가 있어도 할인율이 부풀지 않는다.
drop view if exists public.public_templates;
create view public.public_templates as
  select
    t.id,
    t.name,
    t.description,
    t.platform,
    t.tag,
    t.sort_order,
    (
      select coalesce(sum(p.price * ti.quantity), 0)
        from public.quote_template_items ti
        join public.parts p on p.id = ti.part_id
       where ti.template_id = t.id
    ) as total,
    (
      select coalesce(sum(coalesce(p.list_price, p.price) * ti.quantity), 0)
        from public.quote_template_items ti
        join public.parts p on p.id = ti.part_id
       where ti.template_id = t.id
    ) as list_total,
    (
      select json_agg(
               json_build_object(
                 'category',  ti.category,
                 'name',      p.name,
                 'price',     p.price,
                 'listPrice', p.list_price,
                 'imageUrl',  p.image_url,
                 'qty',       ti.quantity
               )
               order by ti.category
             )
        from public.quote_template_items ti
        join public.parts p on p.id = ti.part_id
       where ti.template_id = t.id
    ) as items
  from public.quote_templates t
  where t.active = true;

grant select on public.public_templates to anon, authenticated;

comment on view public.public_templates is
  '랜딩용 추천 사양. 품목·합계를 미리 조립해 준다. 매입처 링크·재고는 포함하지 않는다.';
