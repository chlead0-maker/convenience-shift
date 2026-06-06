import { supabase } from "./supabase";
import { isoDate, getMonday, addDays } from "./dateUtils";

/* ============================================================
 *  데이터 계층 (Supabase)
 *  ------------------------------------------------------------
 *  - shifts        : 시프트 카드
 *  - special_days  : 요일별 특이사항
 *  - settings      : 매장 이름 등 key/value
 *  화면 컴포넌트는 s.start / s.end 를 쓰지만 DB 컬럼은
 *  start_time / end_time 이므로 여기서 변환합니다.
 * ============================================================ */

// DB row -> 화면용 시프트 객체
function rowToShift(r) {
  return {
    id: r.id,
    day: r.day,
    name: r.name,
    start: r.start_time || "",
    end: r.end_time || "",
    role: r.role || "",
    memo: r.memo || "",
  };
}

// 한 주 데이터(시프트 + 특이사항) 한 번에 불러오기
export async function fetchWeek(weekStart) {
  const [shiftsRes, specialRes] = await Promise.all([
    supabase.from("shifts").select("*").eq("week_start", weekStart),
    supabase.from("special_days").select("*").eq("week_start", weekStart),
  ]);
  if (shiftsRes.error) throw shiftsRes.error;
  if (specialRes.error) throw specialRes.error;

  const shifts = (shiftsRes.data || [])
    .map(rowToShift)
    .sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));

  const special = {};
  (specialRes.data || []).forEach((r) => {
    special[r.day] = r.note;
  });

  return { shifts, special };
}

// 시프트 추가
export async function insertShift(weekStart, s) {
  const { error } = await supabase.from("shifts").insert({
    week_start: weekStart,
    day: s.day,
    name: s.name,
    start_time: s.start || null,
    end_time: s.end || null,
    role: s.role || null,
    memo: s.memo || null,
  });
  if (error) throw error;
}

// 시프트 수정
export async function updateShift(s) {
  const { error } = await supabase
    .from("shifts")
    .update({
      day: s.day,
      name: s.name,
      start_time: s.start || null,
      end_time: s.end || null,
      role: s.role || null,
      memo: s.memo || null,
    })
    .eq("id", s.id);
  if (error) throw error;
}

// 시프트 삭제
export async function deleteShift(id) {
  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) throw error;
}

// 특이사항 저장(있으면 upsert, 비우면 삭제)
export async function setSpecial(weekStart, day, note) {
  if (note && note.trim()) {
    const { error } = await supabase
      .from("special_days")
      .upsert({ week_start: weekStart, day, note: note.trim() }, { onConflict: "week_start,day" });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("special_days")
      .delete()
      .eq("week_start", weekStart)
      .eq("day", day);
    if (error) throw error;
  }
}

// 매장 이름 불러오기
export async function fetchStoreName() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "store_name")
    .maybeSingle();
  if (error) throw error;
  return data?.value || "";
}

// 매장 이름 저장
export async function saveStoreName(value) {
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "store_name", value }, { onConflict: "key" });
  if (error) throw error;
}

/* ---------- Realtime 구독 ----------
 * 해당 주의 shifts / special_days 와 settings 변경을 감지해
 * onChange 콜백을 호출합니다. 콜백에서 다시 fetchWeek 하면
 * 다른 사람의 수정이 내 화면에 자동 반영됩니다.
 */
export function subscribeWeek(weekStart, onChange) {
  const channel = supabase
    .channel(`week-${weekStart}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shifts", filter: `week_start=eq.${weekStart}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "special_days", filter: `week_start=eq.${weekStart}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "settings" },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "events", filter: `week_start=eq.${weekStart}` },
      onChange
    )
    .subscribe();

  // 정리 함수
  return () => {
    supabase.removeChannel(channel);
  };
}

/* ---------- 타임라인 이벤트 (물류 입고 등) ---------- */
export async function fetchEvents(weekStart) {
  const { data, error } = await supabase.from("events").select("*").eq("week_start", weekStart);
  if (error) throw error;
  return data || [];
}

export async function insertEvent(ev) {
  const { error } = await supabase.from("events").insert({
    week_start: ev.week_start, day: ev.day,
    time: ev.time || null, title: ev.title, color: ev.color || null,
  });
  if (error) throw error;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- 월간 보기 지원 ---------- */

// 어떤 달(month)을 그리는 데 필요한 주(월요일) 6개의 week_start 목록
export function monthWeekStarts(year, month) {
  const first = new Date(year, month, 1);
  let mon = getMonday(first);
  const arr = [];
  for (let i = 0; i < 6; i++) {
    arr.push(isoDate(mon));
    mon = addDays(mon, 7);
  }
  return arr;
}

// "YYYY-MM-DD" 문자열을 로컬 Date 로 (타임존 어긋남 방지)
function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 여러 주의 시프트/특이사항을 실제 날짜별로 묶어서 반환
export async function fetchMonth(weekStarts) {
  const [shiftsRes, specialRes] = await Promise.all([
    supabase.from("shifts").select("*").in("week_start", weekStarts),
    supabase.from("special_days").select("*").in("week_start", weekStarts),
  ]);
  if (shiftsRes.error) throw shiftsRes.error;
  if (specialRes.error) throw specialRes.error;

  const shiftsByDate = {};
  (shiftsRes.data || []).forEach((r) => {
    const key = isoDate(addDays(parseDate(r.week_start), r.day));
    (shiftsByDate[key] ||= []).push(rowToShift(r));
  });
  Object.values(shiftsByDate).forEach((list) =>
    list.sort((a, b) => (a.start || "99").localeCompare(b.start || "99"))
  );

  const specialByDate = {};
  (specialRes.data || []).forEach((r) => {
    specialByDate[isoDate(addDays(parseDate(r.week_start), r.day))] = r.note;
  });

  return { shiftsByDate, specialByDate };
}

/* ============================================================
 *  직원 명단 / 고정근무 / 휴무 (2차 기능)
 * ============================================================ */

// 직원 목록
export async function fetchEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function insertEmployee(emp) {
  const { data, error } = await supabase.from("employees").insert({
    name: emp.name, color: emp.color || null, wage: emp.wage || 0, memo: emp.memo || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateEmployee(emp) {
  const { error } = await supabase.from("employees").update({
    name: emp.name, color: emp.color || null, wage: emp.wage || 0,
    memo: emp.memo || null, active: emp.active !== false,
  }).eq("id", emp.id);
  if (error) throw error;
}

export async function deleteEmployee(id) {
  // fixed_shifts / days_off 는 FK on delete cascade 로 자동 삭제됨
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
}

// 고정근무 템플릿
export async function fetchFixedShifts() {
  const { data, error } = await supabase.from("fixed_shifts").select("*");
  if (error) throw error;
  return data || [];
}

export async function insertFixed(f) {
  const { error } = await supabase.from("fixed_shifts").insert({
    employee_id: f.employee_id, day: f.day,
    start_time: f.start_time || null, end_time: f.end_time || null, role: f.role || null,
  });
  if (error) throw error;
}

export async function deleteFixed(id) {
  const { error } = await supabase.from("fixed_shifts").delete().eq("id", id);
  if (error) throw error;
}

// 휴무
export async function fetchDaysOff(dates) {
  const { data, error } = await supabase.from("days_off").select("*").in("date", dates);
  if (error) throw error;
  return data || [];
}

export async function addDayOff(employee_id, date, reason) {
  const { error } = await supabase.from("days_off")
    .upsert({ employee_id, date, reason: reason || null }, { onConflict: "employee_id,date" });
  if (error) throw error;
}

export async function removeDayOff(id) {
  const { error } = await supabase.from("days_off").delete().eq("id", id);
  if (error) throw error;
}

// 고정근무로 이번 주 채우기 (중복/휴무 제외하고 shifts 에 삽입). 삽입한 개수 반환
export async function fillFixedShifts(weekKey, weekDates) {
  const [emps, fixed, offs, current] = await Promise.all([
    fetchEmployees(), fetchFixedShifts(), fetchDaysOff(weekDates), fetchWeek(weekKey),
  ]);
  const empById = Object.fromEntries(emps.map((e) => [e.id, e]));
  const offSet = new Set(offs.map((o) => `${o.employee_id}|${o.date}`));
  const existKey = new Set(current.shifts.map((s) => `${s.name}|${s.day}|${s.start}`));

  const rows = [];
  fixed.forEach((f) => {
    const emp = empById[f.employee_id];
    if (!emp || emp.active === false) return;
    const date = weekDates[f.day];
    if (offSet.has(`${f.employee_id}|${date}`)) return;            // 휴무 제외
    if (existKey.has(`${emp.name}|${f.day}|${f.start_time || ""}`)) return; // 중복 제외
    rows.push({
      week_start: weekKey, day: f.day, name: emp.name,
      start_time: f.start_time || null, end_time: f.end_time || null, role: f.role || null,
    });
  });
  if (rows.length) {
    const { error } = await supabase.from("shifts").insert(rows);
    if (error) throw error;
  }
  return rows.length;
}

// 직원/고정근무/휴무 변경 구독
export function subscribeRoster(onChange) {
  const channel = supabase
    .channel("roster-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "fixed_shifts" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "days_off" }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// 전체 변경 구독 (월간 보기에서 사용 — 여러 주가 보이므로 필터 없이)
export function subscribeAll(onChange) {
  const channel = supabase
    .channel("all-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "special_days" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
