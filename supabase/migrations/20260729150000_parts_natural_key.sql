-- parts의 식별 키 조정
--
-- 배경: 엑셀 부품단가 시트 695개 품목 중 69개는 "고유번호" 칸이 비어 있다
--       (예: MSI MAG B650M 박격포 WIFI). 실제 취급 제품이므로 버릴 수 없다.
--
-- 확인 결과 (카테고리, 제품명) 조합은 695행 전체에서 중복이 0건이라
-- 이 조합을 자연키로 삼는다. 고유번호는 엑셀과 대조하기 위한 참조값으로
-- 남기되 nullable로 바꾼다.
--
-- 인덱스는 표현식이 아닌 일반 컬럼 조합으로 만든다.
-- PostgREST의 on_conflict upsert가 컬럼명만 받기 때문이다.
-- 이름 앞뒤 공백 정규화는 임포트 스크립트에서 처리한다.

alter table public.parts
  alter column part_no drop not null;

alter table public.parts
  add constraint parts_category_name_key unique (category, name);
