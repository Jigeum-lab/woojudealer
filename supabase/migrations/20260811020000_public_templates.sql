-- 추천 사양 공개 뷰
--
-- 랜딩의 '구매' 쪽에서 가성비형·중급형·고급형을 실제 부품·가격으로 보여준다.
-- quote_templates는 로그인 사용자 전용이라 비로그인 방문자가 읽을 수 없어
-- public_parts와 같은 방식으로 필요한 컬럼만 뷰로 연다.
--
-- 합계와 품목을 뷰에서 미리 만들어 준다. 클라이언트가 템플릿·품목·부품을
-- 세 번 왕복하며 조립하지 않게 하려는 것이다. 가격은 parts를 그대로 참조하므로
-- 단가를 고치면 합계도 따라 바뀐다(스냅샷이 아니다).

create or replace view public.public_templates as
  select
    t.id,
    t.name,
    t.description,
    t.platform,
    t.sort_order,
    (
      select coalesce(sum(p.price * ti.quantity), 0)
        from public.quote_template_items ti
        join public.parts p on p.id = ti.part_id
       where ti.template_id = t.id
    ) as total,
    (
      select json_agg(
               json_build_object(
                 'category', ti.category,
                 'name',     p.name,
                 'price',    p.price,
                 'imageUrl', p.image_url,
                 'qty',      ti.quantity
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
