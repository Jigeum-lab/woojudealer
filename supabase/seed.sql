-- 우주딜러 PoC 데모 시드
-- 회사 3곳 + 신청 10건 (status 분포: requested 2 / pickup 1 / wiping 2 / certified 2 / done 3)
-- 트리거가 display_no, cert_no 자동 생성.

-- =====================================================
-- companies
-- =====================================================
insert into public.companies (id, name, biz_no, contact, phone, address) values
  ('11111111-1111-1111-1111-111111111111', '주식회사 예시기업',  '123-45-67890', '홍길동',  '010-1234-5678', '서울특별시 강남구 테헤란로 123, 8층'),
  ('22222222-2222-2222-2222-222222222222', '강남게임피씨방',     '211-86-22345', '김민준',  '010-2222-3456', '서울특별시 강남구 강남대로 246'),
  ('33333333-3333-3333-3333-333333333333', '테크노밸리(주)',     '314-81-55678', '이서연',  '010-9876-5432', '경기도 성남시 분당구 판교로 250');

-- =====================================================
-- requests (10건)
-- created_by는 데모 사용자 가입 후 별도 UPDATE로 연결 (지금은 null 허용)
-- created_at은 시드 시점 기준 과거 N일
-- =====================================================
insert into public.requests
  (company_id, status, items_quantity, items_manufacturer, items_age, items_os, pickup_date, pickup_time_slot, pickup_address, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'done',      30, 'Dell',   '5년 이상', 'Windows 10', current_date - interval '87 day',  '오전 (09:00~12:00)', '서울특별시 강남구 테헤란로 123, 8층', now() - interval '92 day'),
  ('11111111-1111-1111-1111-111111111111', 'certified', 15, 'HP',     '3~5년',   'Windows 11', current_date - interval '57 day',  '오전 (09:00~12:00)', '서울특별시 강남구 테헤란로 123, 8층', now() - interval '62 day'),
  ('11111111-1111-1111-1111-111111111111', 'wiping',     8, 'Lenovo', '~3년',    'Windows 11', current_date - interval '2 day',   '오전 (09:00~12:00)', '서울특별시 강남구 테헤란로 123, 8층', now() - interval '30 day'),
  ('11111111-1111-1111-1111-111111111111', 'pickup',    22, '삼성',   '3~5년',   'Windows 10', current_date + interval '1 day',   '오전 (09:00~12:00)', '서울특별시 강남구 테헤란로 123, 8층', now() - interval '28 day'),
  ('11111111-1111-1111-1111-111111111111', 'requested', 12, 'Dell',   '~3년',    'Windows 11', current_date + interval '2 day',   '오전 (09:00~12:00)', '서울특별시 강남구 테헤란로 123, 8층', now() - interval '27 day'),
  ('22222222-2222-2222-2222-222222222222', 'done',      40, '기타',   '5년 이상', '기타',       current_date - interval '70 day',  '오전 (09:00~12:00)', '서울특별시 강남구 강남대로 246',     now() - interval '75 day'),
  ('22222222-2222-2222-2222-222222222222', 'certified', 18, 'HP',     '3~5년',   'Windows 10', current_date - interval '28 day',  '오전 (09:00~12:00)', '서울특별시 강남구 강남대로 246',     now() - interval '33 day'),
  ('33333333-3333-3333-3333-333333333333', 'done',      50, 'Lenovo', '5년 이상', 'Linux',      current_date - interval '115 day', '오전 (09:00~12:00)', '경기도 성남시 분당구 판교로 250',     now() - interval '120 day'),
  ('33333333-3333-3333-3333-333333333333', 'wiping',    25, 'Dell',   '3~5년',   'Windows 11', current_date - interval '1 day',   '오전 (09:00~12:00)', '경기도 성남시 분당구 판교로 250',     now() - interval '12 day'),
  ('33333333-3333-3333-3333-333333333333', 'requested', 10, '삼성',   '~3년',    'Windows 11', current_date + interval '2 day',   '오전 (09:00~12:00)', '경기도 성남시 분당구 판교로 250',     now() - interval '6 day');
