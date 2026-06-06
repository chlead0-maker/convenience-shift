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
    .subscribe();

  // 정리 함수
  return () => {
    supabase.removeChannel(channel);
  };
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
