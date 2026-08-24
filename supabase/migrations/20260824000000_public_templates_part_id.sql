-- 추천 사양 공개 뷰에 part_id 추가
--
-- 랜딩 카드에서 "이 사양으로 시작하기"를 누르면 고객 구성기가 그 구성을 그대로
-- 담아야 하는데, 뷰가 이름·가격만 주고 부품 id를 주지 않아 되살릴 수가 없었다.
-- (대표 피드백 2026-08-24: "일반 페이지에서 견적을 시작하면 아무것도 안 뜬다")
--
-- part_id는 public_parts가 이미 공개하는 값이라 새로 노출되는 정보는 없다.

create or replace view public.public_templates as
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
                 'partId',    ti.part_id,
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
  '랜딩용 추천 사양. 품목·합계를 미리 조립해 준다. part_id는 구성기가 선택을 되살리는 데 쓴다. 매입처 링크·재고는 포함하지 않는다.';
