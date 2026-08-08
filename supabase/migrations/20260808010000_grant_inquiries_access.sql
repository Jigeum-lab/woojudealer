-- inquiries 테이블 권한 보정
--
-- 20260727000000_restore_production_rls.sql이 public 스키마 전체에서 권한을
-- 회수한 뒤로, 새로 만든 테이블은 GRANT를 명시해야 한다. inquiries를 만들 때
-- RLS 정책만 걸고 테이블 권한을 빠뜨려 관리자 조회가 403으로 막혔다.
--
-- anon에는 주지 않는다. 비로그인 접수는 submit_inquiry(security definer)만
-- 통과하면 되고, 직접 조회 통로는 열지 않는다.

grant select, update on public.inquiries to authenticated;
