-- 부품별 "마지막으로 매입처 가격을 확인한 시각"
--
-- 대표 요청(2026-08-24): 어드민에서 새로고침하면 가격도 같이 긁어와 달라.
-- 그런데 새로고침 한 번에 405건을 전부 훑으면 6분이 걸리고 컴퓨존에도 몰린다.
-- 무엇이 낡았는지 알아야 "오래된 것만" 고를 수 있어서 확인 시각을 따로 남긴다.
--
-- updated_at으로는 대신할 수 없다. 그건 가격이 '바뀌었을 때'만 움직이는데,
-- 확인했으나 그대로인 경우(대부분)와 아예 확인한 적 없는 경우를 구분해야 한다.
--
-- 기존 695건은 null로 남는다 = "한 번도 확인 안 함" → 첫 갱신 대상이 된다.

alter table public.parts
  add column if not exists price_checked_at timestamptz;

comment on column public.parts.price_checked_at is
  '매입처(컴퓨존)에서 현재가를 마지막으로 확인한 시각. null이면 확인한 적 없음. 가격 변동 여부와 무관하게 갱신된다.';

-- 오래된 것부터 고르는 질의를 위한 인덱스.
-- nulls first가 기본이라 "확인 안 한 것"이 먼저 나온다.
create index if not exists parts_price_checked_at_idx
  on public.parts(price_checked_at)
  where active and link is not null;
