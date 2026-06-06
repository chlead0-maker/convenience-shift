-- ============================================================
--  편의점 시프트표 — 3차: 직원 수당 옵션 (주휴/야간)
--  사용법: Supabase SQL Editor 에 붙여넣고 RUN (여러 번 실행해도 안전)
-- ============================================================
alter table public.employees add column if not exists weekly_allowance boolean default false; -- 주휴수당 지급
alter table public.employees add column if not exists night_allowance  boolean default false; -- 야간수당 지급
