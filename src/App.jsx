import { useState, useEffect, useCallback, useRef } from "react";
import { C, DAY_NAMES, BAND } from "./lib/constants";
import {
  isoDate, getMonday, addDays, fmtMD,
  personColor, hours, isSameDay,
} from "./lib/dateUtils";
import { isSupabaseConfigured } from "./lib/supabase";
import {
  fetchWeek, insertShift, updateShift, deleteShift,
  setSpecial as dbSetSpecial, fetchStoreName, saveStoreName, subscribeWeek,
  fetchMonth, monthWeekStarts, subscribeAll,
} from "./lib/db";
import ShiftCard from "./components/ShiftCard";
import ShiftModal from "./components/ShiftModal";
import SpecialModal from "./components/SpecialModal";
import SetupNotice from "./components/SetupNotice";
import InstallButton from "./components/InstallButton";
import CalendarModal from "./components/CalendarModal";
import WeekTimeline from "./components/WeekTimeline";
import MonthGrid from "./components/MonthGrid";

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  return <Scheduler />;
}

const VIEWS = [
  ["day", "📅 일간"],
  ["week", "🗂 주간"],
  ["month", "🗓 월간"],
  ["cards", "✏️ 카드"],
];

function Scheduler() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [week, setWeek] = useState({ shifts: [], special: {} });
  const [monthData, setMonthData] = useState({ shiftsByDate: {}, specialByDate: {} });
  const [storeName, setStoreName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [specialModal, setSpecialModal] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [view, setView] = useState(() => {
    try { return localStorage.getItem("cvs-view") || "week"; } catch { return "week"; }
  });
  const modalOpenRef = useRef(false);

  const monday = getMonday(anchorDate);
  const weekKey = isoDate(monday);
  const today = new Date();
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const dayIndex = Math.min(6, Math.max(0,
    Math.round((new Date(year, month, anchorDate.getDate()) - monday) / 86400000)
  ));
  const loadKey = view === "month" ? `m-${year}-${month}` : `w-${weekKey}`;

  const changeView = (v) => {
    setView(v);
    try { localStorage.setItem("cvs-view", v); } catch { /* ignore */ }
  };

  const refresh = useCallback(async () => {
    try {
      if (view === "month") {
        setMonthData(await fetchMonth(monthWeekStarts(year, month)));
      } else {
        setWeek(await fetchWeek(weekKey));
      }
      setError("");
    } catch (e) {
      setError(e?.message || "데이터를 불러오지 못했어요.");
    }
  }, [view, weekKey, year, month]);

  // 매장 이름은 처음 한 번만
  useEffect(() => {
    let active = true;
    (async () => {
      try { const n = await fetchStoreName(); if (active) setStoreName(n || ""); } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);

  // 보기/기간이 바뀔 때 데이터 로드
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        if (view === "month") {
          const md = await fetchMonth(monthWeekStarts(year, month));
          if (active) setMonthData(md);
        } else {
          const d = await fetchWeek(weekKey);
          if (active) setWeek(d);
        }
        if (active) setError("");
      } catch (e) {
        if (active) setError(e?.message || "데이터를 불러오지 못했어요.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 실시간 구독
  useEffect(() => {
    const cb = () => { if (!modalOpenRef.current) refresh(); };
    const unsub = view === "month" ? subscribeAll(cb) : subscribeWeek(weekKey, cb);
    return unsub;
  }, [loadKey, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // 안전장치: 복귀 시 + 15초마다 자동 갱신
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === "visible" && !modalOpenRef.current) refresh();
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    const id = setInterval(sync, 15000);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      clearInterval(id);
    };
  }, [refresh]);

  useEffect(() => {
    modalOpenRef.current = !!(modal || specialModal !== null || editingName || calendarOpen);
  }, [modal, specialModal, editingName, calendarOpen]);

  const upsertShift = async (s) => {
    setModal(null);
    try {
      if (s.id) await updateShift(s);
      else await insertShift(weekKey, s);
      await refresh();
    } catch (e) { setError(e?.message || "저장에 실패했어요."); }
  };
  const removeShift = async (id) => {
    setModal(null);
    try { await deleteShift(id); await refresh(); }
    catch (e) { setError(e?.message || "삭제에 실패했어요."); }
  };
  const handleSpecial = async (day, text) => {
    setSpecialModal(null);
    try { await dbSetSpecial(weekKey, day, text); await refresh(); }
    catch (e) { setError(e?.message || "특이사항 저장에 실패했어요."); }
  };
  const commitName = async () => {
    const v = nameDraft.trim();
    setStoreName(v);
    setEditingName(false);
    try { await saveStoreName(v); } catch (e) { setError(e?.message || "매장 이름 저장에 실패했어요."); }
  };

  // 기간 이동
  const go = (dir) => {
    if (view === "day") setAnchorDate(addDays(anchorDate, dir));
    else if (view === "month") setAnchorDate(new Date(year, month + dir, 1));
    else setAnchorDate(addDays(anchorDate, dir * 7));
  };

  // 가운데 기간 라벨
  let periodLabel;
  if (view === "day") periodLabel = `${month + 1}월 ${anchorDate.getDate()}일 (${DAY_NAMES[dayIndex]})`;
  else if (view === "month") periodLabel = `${year}년 ${month + 1}월`;
  else periodLabel = `${fmtMD(monday)} ~ ${fmtMD(addDays(monday, 6))}`;

  // 요약 대상 시프트
  let summarySource, summaryTitle;
  if (view === "month") {
    summarySource = Object.values(monthData.shiftsByDate).flat();
    summaryTitle = "이 달 근무 요약";
  } else if (view === "day") {
    summarySource = week.shifts.filter((s) => s.day === dayIndex);
    summaryTitle = "이 날 근무 요약";
  } else {
    summarySource = week.shifts;
    summaryTitle = "주간 근무 요약";
  }
  const summary = {};
  summarySource.forEach((s) => {
    if (!summary[s.name]) summary[s.name] = { count: 0, hrs: 0 };
    summary[s.name].count++;
    summary[s.name].hrs += hours(s.start, s.end);
  });
  const summaryList = Object.entries(summary).sort((a, b) => b[1].hrs - a[1].hrs);

  // 타임라인용 days 배열
  const weekDays = DAY_NAMES.map((dn, i) => ({
    dayIndex: i, date: addDays(monday, i), dayName: dn,
    shifts: week.shifts.filter((s) => s.day === i), special: week.special[i],
  }));
  const dayDays = [{
    dayIndex, date: addDays(monday, dayIndex), dayName: DAY_NAMES[dayIndex],
    shifts: week.shifts.filter((s) => s.day === dayIndex), special: week.special[dayIndex],
  }];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'IBM Plex Sans KR', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-5">
        {/* header */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            {editingName ? (
              <div className="flex gap-2 items-center">
                <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && commitName()}
                  placeholder="매장 이름"
                  className="border rounded-lg px-3 py-1.5 text-lg outline-none"
                  style={{ borderColor: C.line, color: C.ink }} />
                <button onClick={commitName} className="px-3 py-1.5 rounded-lg text-white font-semibold"
                  style={{ background: C.accent }}>확인</button>
              </div>
            ) : (
              <button onClick={() => { setNameDraft(storeName); setEditingName(true); }} className="text-left">
                <div style={{ fontFamily: "'Do Hyeon', sans-serif", fontSize: 30, lineHeight: 1.1, color: C.ink }}>
                  {storeName || "우리 편의점"} <span style={{ color: C.accent }}>시프트표</span>
                </div>
                <div className="text-xs mt-1" style={{ color: C.sub }}>매장 이름을 누르면 수정돼요 · 주간 근무표</div>
              </button>
            )}
          </div>
          <InstallButton />
        </div>

        {/* period nav */}
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-4"
          style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <button onClick={() => go(-1)} className="px-3 py-1.5 rounded-lg font-bold" style={{ background: "#F0EFEA", color: C.ink }}>← 이전</button>
          <div className="text-center">
            <button onClick={() => setCalendarOpen(true)}
              className="font-bold text-base sm:text-lg inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
              style={{ color: C.ink, background: "#F0EFEA" }}>
              <span>📅</span><span>{periodLabel}</span>
            </button>
            <div>
              <button onClick={() => setAnchorDate(new Date())} className="text-xs underline" style={{ color: C.accent }}>오늘로</button>
            </div>
          </div>
          <button onClick={() => go(1)} className="px-3 py-1.5 rounded-lg font-bold" style={{ background: "#F0EFEA", color: C.ink }}>다음 →</button>
        </div>

        {/* view toggle */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "#ECEAE2" }}>
          {VIEWS.map(([v, label]) => (
            <button key={v} onClick={() => changeView(v)}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg transition"
              style={view === v
                ? { background: C.card, color: C.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                : { background: "transparent", color: C.sub }}>
              {label}
            </button>
          ))}
        </div>

        {/* share note */}
        <div className="text-xs rounded-lg px-3 py-2 mb-4 flex items-center gap-2"
          style={{ background: "#E9F6F3", color: C.accentDark }}>
          <span>👥</span>
          <span>이 표는 공유받은 모든 직원이 함께 보고 수정할 수 있어요. 변경은 자동 저장·실시간 반영됩니다.</span>
        </div>

        {error && (
          <div className="text-xs rounded-lg px-3 py-2 mb-4" style={{ background: "#FCF1EF", color: "#C0392B" }}>⚠️ {error}</div>
        )}

        {loading ? (
          <div className="text-center py-20" style={{ color: C.sub }}>불러오는 중…</div>
        ) : (
          <>
            {view === "month" ? (
              <MonthGrid
                anchorDate={anchorDate}
                today={today}
                shiftsByDate={monthData.shiftsByDate}
                specialByDate={monthData.specialByDate}
                onPickDay={(d) => { setAnchorDate(d); changeView("day"); }}
              />
            ) : view === "cards" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {weekDays.map((d) => {
                  const isToday = isSameDay(d.date, today);
                  const headColor = d.dayIndex === 6 ? "#D81B60" : d.dayIndex === 5 ? "#3B6EA8" : C.ink;
                  const dayShifts = [...d.shifts].sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));
                  return (
                    <div key={d.dayIndex} className="rounded-xl p-2.5 flex flex-col"
                      style={{ background: C.card, border: isToday ? `2px solid ${C.accent}` : `1px solid ${C.line}`, minHeight: 130 }}>
                      <div className="flex items-baseline justify-between mb-1">
                        <div className="font-bold" style={{ color: headColor }}>
                          {d.dayName}<span className="text-xs ml-1" style={{ color: C.sub }}>{fmtMD(d.date)}</span>
                        </div>
                        {isToday && <span className="text-xs font-bold" style={{ color: C.accent }}>오늘</span>}
                      </div>
                      <button onClick={() => setSpecialModal(d.dayIndex)}
                        className="text-left text-xs rounded px-2 py-1 mb-2 truncate"
                        style={d.special ? { background: "#FFF4DA", color: "#9A6B00", fontWeight: 600 } : { background: "#F4F3EE", color: C.sub }}>
                        {d.special ? `⚑ ${d.special}` : "+ 특이사항"}
                      </button>
                      <div className="flex-1">
                        {dayShifts.map((s) => (
                          <ShiftCard key={s.id} s={s} onClick={() => setModal({ dayIndex: d.dayIndex, initial: s })} />
                        ))}
                      </div>
                      <button onClick={() => setModal({ dayIndex: d.dayIndex, initial: null })}
                        className="w-full mt-1 py-1.5 rounded-lg text-sm font-semibold border border-dashed"
                        style={{ color: C.accent, borderColor: C.accent }}>+ 시프트</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <WeekTimeline
                days={view === "day" ? dayDays : weekDays}
                single={view === "day"}
                today={today}
                onEditShift={(s) => setModal({ dayIndex: s.day, initial: s })}
                onAddShift={(i) => setModal({ dayIndex: i, initial: null })}
                onEditSpecial={(i) => setSpecialModal(i)}
              />
            )}

            {/* legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs" style={{ color: C.sub }}>
              {view === "cards" ? (
                Object.values(BAND).filter((b) => b.label).map((b) => (
                  <span key={b.label} className="flex items-center gap-1.5">
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: b.bar }} /> {b.label}
                  </span>
                ))
              ) : view === "month" ? (
                <span>날짜를 누르면 그 날의 타임라인으로 이동해요</span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(91,91,214,0.18)", border: `1px solid ${C.line}` }} /> 야간(22~06시)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: "#fff", border: `1px solid ${C.line}` }} /> 주간
                  </span>
                  <span>· 색은 직원별 구분 · 블록을 누르면 수정</span>
                </>
              )}
            </div>

            {/* summary */}
            {summaryList.length > 0 && (
              <div className="mt-6 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="font-bold mb-3" style={{ color: C.ink }}>{summaryTitle}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {summaryList.map(([name, v]) => (
                    <div key={name} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#F8F7F3" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 10, background: personColor(name) }} />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: C.ink }}>{name}</div>
                        <div className="text-xs" style={{ color: C.sub }}>
                          {v.count}회 · {v.hrs % 1 === 0 ? v.hrs : v.hrs.toFixed(1)}시간
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal && (
        <ShiftModal
          dayIndex={modal.dayIndex}
          dateLabel={fmtMD(addDays(monday, modal.dayIndex))}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSave={upsertShift}
          onDelete={removeShift}
        />
      )}
      {calendarOpen && (
        <CalendarModal
          selectedMonday={monday}
          onPick={(d) => { setAnchorDate(d); setCalendarOpen(false); }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
      {specialModal !== null && (
        <SpecialModal
          dayIndex={specialModal}
          dateLabel={fmtMD(addDays(monday, specialModal))}
          initial={week.special[specialModal] || ""}
          onClose={() => setSpecialModal(null)}
          onSave={(t) => handleSpecial(specialModal, t)}
        />
      )}
    </div>
  );
}
