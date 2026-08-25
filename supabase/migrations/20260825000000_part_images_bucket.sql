-- 부품 사진 저장소
--
-- 대표 피드백(2026-08-25): "부품 그림이 안 맞아서 다른 게 많은데 이건 어떻게 수정하죠?"
--
-- 지금 사진은 전부 레포 안 정적 파일(public/wooju/parts/*.jpg 592장)이라, 한 장 바꾸려면
-- 파일을 넣고 다시 배포해야 한다. 대표가 손댈 방법이 없다는 뜻이다.
-- 사진을 Storage로 옮겨 화면에서 바로 교체할 수 있게 한다.
--
-- 기존 로컬 경로(/wooju/parts/...)는 그대로 둔다. image_url이 절대/상대 URL을 가리지
-- 않으므로 새로 올린 것만 Storage를 쓰고 나머지는 지금처럼 뜬다. 한 번에 옮기지 않는
-- 이유는 잘못 매칭된 사진을 대표가 어차피 갈아끼울 것이기 때문이다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'part-images',
  'part-images',
  true,                                   -- 상품 사진이라 공개. 견적 화면이 비로그인에도 뜬다
  5242880,                                -- 5MB — 부품 사진에 그 이상은 필요 없다
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 읽기는 누구나(공개 버킷), 쓰기·삭제는 관리자만.
drop policy if exists "part_images_read"   on storage.objects;
drop policy if exists "part_images_write"  on storage.objects;
drop policy if exists "part_images_update" on storage.objects;
drop policy if exists "part_images_delete" on storage.objects;

create policy "part_images_read" on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'part-images');

create policy "part_images_write" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'part-images' and public.is_admin());

create policy "part_images_update" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'part-images' and public.is_admin());

create policy "part_images_delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'part-images' and public.is_admin());
