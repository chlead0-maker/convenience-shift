-- ============================================================
--  편의점 시프트표 — 5차: 직원 입사일 / 첫 근무일
--  Supabase SQL Editor 에 붙여넣고 RUN (여러 번 실행해도 안전)
-- ============================================================
alter table public.employees add column if not exists join_date       date; -- 입사일
alter table public.employees add column if not exists first_work_date date; -- 첫 근무일
