-- ============================================================
--  편의점 시프트표 — 2차 기능 테이블 (직원·고정근무·휴무·이벤트)
--  사용법: Supabase 대시보드 → SQL Editor → New query →
--          아래 전체 붙여넣고 RUN ▶ (한 번이면 끝)
--  ※ 이 SQL은 여러 번 실행해도 안전합니다(if not exists).
-- ============================================================

-- 1) 직원 명단 (이름·색·시급)
create table if not exists public.employees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text,                 -- 카드/블록 색 (비우면 자동 배정)
  wage        int  default 0,       -- 시급(원)
  memo        text,
  active      boolean default true, -- 퇴사 등으로 숨길 때 false
  sort        int  default 0,
  created_at  timestamptz default now()
);

-- 2) 고정근무 템플릿 (매주 반복되는 근무)
create table if not exists public.fixed_shifts (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  day         int  not null,        -- 0=월 … 6=일
  start_time  text,                 -- "HH:MM"
  end_time    text,
  role        text
);
create index if not exists fixed_shifts_emp_idx on public.fixed_shifts (employee_id);

-- 3) 휴무 (특정 직원이 특정 날짜에 쉼)
create table if not exists public.days_off (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  date        date not null,
  reason      text,
  unique (employee_id, date)
);

-- 4) 타임라인 이벤트 (물류 입고 등 시간대 특이사항)
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  week_start  date not null,
  day         int  not null,        -- 0=월 … 6=일
  time        text,                 -- "HH:MM" (비우면 종일/상단 표시)
  title       text not null,        -- 예: "물류 입고"
  color       text,
  created_at  timestamptz default now()
);
create index if not exists events_week_idx on public.events (week_start);

-- ============================================================
--  접근 권한 (RLS) — 기존과 동일하게 "누구나 읽기/쓰기"
-- ============================================================
alter table public.employees    enable row level security;
alter table public.fixed_shifts enable row level security;
alter table public.days_off     enable row level security;
alter table public.events       enable row level security;

drop policy if exists "open_all_employees" on public.employees;
create policy "open_all_employees" on public.employees for all using (true) with check (true);

drop policy if exists "open_all_fixed" on public.fixed_shifts;
create policy "open_all_fixed" on public.fixed_shifts for all using (true) with check (true);

drop policy if exists "open_all_daysoff" on public.days_off;
create policy "open_all_daysoff" on public.days_off for all using (true) with check (true);

drop policy if exists "open_all_events" on public.events;
create policy "open_all_events" on public.events for all using (true) with check (true);

-- ============================================================
--  Realtime (실시간 동기화) 활성화
-- ============================================================
alter publication supabase_realtime add table public.employees;
alter publication supabase_realtime add table public.fixed_shifts;
alter publication supabase_realtime add table public.days_off;
alter publication supabase_realtime add table public.events;
