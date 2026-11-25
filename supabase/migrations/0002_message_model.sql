-- 페르소나 응답을 만든 모델 이름을 저장합니다.
-- Supabase 대시보드 > SQL Editor 에서 실행하세요. (여러 번 실행해도 안전합니다.)
alter table messages add column if not exists model text;
