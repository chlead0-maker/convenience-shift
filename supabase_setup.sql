-- ============================================================
--  편의점 시프트표 — Supabase 테이블 생성 SQL
--  사용법: Supabase 대시보드 → 왼쪽 메뉴 SQL Editor → New query
--          아래 전체를 붙여넣고 RUN(▶) 한 번이면 끝.
-- ============================================================

-- 1) 시프트 카드
create table if not exists public.shifts (
  id          uuid primary key default gen_random_uuid(),
  week_start  date not null,          -- 그 주 월요일 날짜
  day         int  not null,          -- 0=월 … 6=일
  name        text not null,
  start_time  text,                   -- "HH:MM"
  end_time    text,
  role        text,
  memo        text,
  created_at  timestamptz default now()
);
create index if not exists shifts_week_idx on public.shifts (week_start);

-- 2) 요일별 특이사항 (한 요일에 하나)
create table if not exists public.special_days (
  id          uuid primary key default gen_random_uuid(),
  week_start  date not null,
  day         int  not null,
  note        text,
  unique (week_start, day)
);

-- 3) 설정 (매장 이름 등 key/value)
create table if not exists public.settings (
  key   text primary key,
  value text
);

-- ============================================================
--  접근 권한 (RLS)
--  처음엔 "누구나 읽기/쓰기" 로 열어 빠르게 시작합니다.
--  (작업지시서 6번: 계정 없이 링크로 함께 편집)
--  ※ 나중에 외부에 널리 공개할 때는 매장 PIN 같은 제한을
--    추가하는 방안을 따로 안내드립니다.
-- ============================================================
alter table public.shifts       enable row level security;
alter table public.special_days enable row level security;
alter table public.settings     enable row level security;

-- 모든 작업 허용 정책 (anon 키로 읽기/쓰기/수정/삭제)
drop policy if exists "open_all_shifts" on public.shifts;
create policy "open_all_shifts" on public.shifts
  for all using (true) with check (true);

drop policy if exists "open_all_special" on public.special_days;
create policy "open_all_special" on public.special_days
  for all using (true) with check (true);

drop policy if exists "open_all_settings" on public.settings;
create policy "open_all_settings" on public.settings
  for all using (true) with check (true);

-- ============================================================
--  Realtime (실시간 동기화) 활성화
--  세 테이블의 변경을 구독할 수 있게 publication 에 추가
-- ============================================================
alter publication supabase_realtime add table public.shifts;
alter publication supabase_realtime add table public.special_days;
alter publication supabase_realtime add table public.settings;
