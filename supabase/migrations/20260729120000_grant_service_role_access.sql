-- service_role에 public 스키마 접근 권한 부여
--
-- 배경:
--   init.sql · demo_open_rls · add_settlements 어디에도 GRANT 구문이 없었고,
--   grant_anon_access.sql(20260608000000)은 anon·authenticated에만 부여했다.
--   그 결과 service_role은 companies·profiles·requests·certificates·settlements
--   5개 테이블 전부에서 "permission denied" 상태였다.
--
-- 증상:
--   createServiceClient()로 조회하는 공개 QR 인증서 검증 페이지
--   (app/c/[qr_token]/page.tsx)가 유효한 토큰에 대해서도 notFound()로 떨어졌다.
--
-- 원인:
--   service_role은 RLS를 우회하지만 테이블 레벨 GRANT까지 우회하지는 않는다.
--   RLS 정책이 아무리 열려 있어도 GRANT가 없으면 접근이 거부된다.

grant usage on schema public to service_role;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- 이후 추가되는 테이블·시퀀스·함수에도 자동 적용되도록 기본 권한 설정
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
