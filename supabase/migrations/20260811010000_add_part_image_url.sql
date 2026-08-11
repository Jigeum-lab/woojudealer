-- 부품 사진 URL
--
-- 기존 우주딜러(Firebase Storage)에 부품 사진이 분류별로 올라가 있고
-- 파일명이 고유번호(part_no)와 같다. 다만 확장자가 png/jpg/JPG로 섞여 있어
-- 클라이언트가 추측하면 404가 계속 난다. scripts/link_part_images.py가
-- 버킷을 한 번 훑어 정확한 URL을 여기 채운다.
--
-- 사진이 없는 부품(쿨러·케이스팬 일부)은 null로 남고 화면에서 대체 표시한다.

alter table public.parts add column if not exists image_url text;

comment on column public.parts.image_url is
  '부품 사진 URL. scripts/link_part_images.py가 채운다. 없으면 null.';

-- 공개 뷰에도 사진을 태운다. 매입처 링크·재고는 계속 제외.
create or replace view public.public_parts as
  select
    id,
    part_no,
    category,
    platform,
    name,
    price,
    sold_out,
    grade,
    specs,
    image_url
  from public.parts
  where active = true;

grant select on public.public_parts to anon, authenticated;
