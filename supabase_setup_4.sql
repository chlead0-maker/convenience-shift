-- ============================================================
--  편의점 시프트표 — 4차: 월급제 + 이벤트 반복
--  Supabase SQL Editor 에 붙여넣고 RUN (여러 번 실행해도 안전)
-- ============================================================
alter table public.employees add column if not exists pay_type    text default 'hourly'; -- 'hourly'(시급제) | 'monthly'(월급제)
alter table public.employees add column if not exists monthly_pay  int  default 0;       -- 월급(원)
alter table public.events    add column if not exists repeat       text default 'none';   -- 'none' | 'weekly'(매주 반복)
