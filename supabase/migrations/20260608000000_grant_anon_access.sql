-- anon/authenticated 역할에 public 스키마 전체 테이블 접근 권한 부여
-- demo_open_rls 정책만으로는 부족 — GRANT도 필요

grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
