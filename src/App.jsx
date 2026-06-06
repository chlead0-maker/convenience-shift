import { useState, useEffect, useCallback, useRef } from "react";
import { C, DAY_NAMES, BAND } from "./lib/constants";
import {
  isoDate, getMonday, addDays, fmtMD,
  personColor, hours, isSameDay, setColorOverrides,
} from "./lib/dateUtils";
import { isSupabaseConfigured } from "./lib/supabase";
import {
  fetchWeek, insertShift, updateShift, deleteShift,
  setSpecial as dbSetSpecial, fetchStoreName, saveStoreName, subscribeWeek,
  fetchMonth, monthWeekStarts, subscribeAll,
  fetchEmployees, fetchFixedShifts, fetchDaysOff, subscribeRoster,
  fetchEvents, addDayOff,
} from "./lib/db";
import { virtualShiftsForDate, mergeReal } from "./lib/fixed";
import ShiftCard from "./components/ShiftCard";
import ShiftModal from "./components/ShiftModal";
import SpecialModal from "./components/SpecialModal";
import SetupNotice from "./components/SetupNotice";
import InstallButton from "./components/InstallButton";
import CalendarModal from "./components/CalendarModal";
import WeekTimeline from "./components/WeekTimeline";
import MonthGrid from "./components/MonthGrid";
import EmployeeManager from "./components/EmployeeManager";
import DayOffModal from "./components/DayOffModal";
import EventModal from "./components/EventModal";
import TipsModal from "./components/TipsModal";
import { computeLabor } from "./lib/labor";

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
  const [employees, setEmployees] = useState([]);
  const [fixedShifts, setFixedShifts] = useState([]);
  const [daysOff, setDaysOff] = useState([]);
  const [events, setEvents] = useState([]);
  const [empManagerOpen, setEmpManagerOpen] = useState(false);
  const [dayOffOpen, setDayOffOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [bigFont, setBigFont] = useState(() => {
    try { return localStorage.getItem("cvs-font") === "big"; } catch { return false; }
  });
  const [view, setView] = useState(() => {
    try { return localStorage.getItem("cvs-view") || "week"; } catch { return "week"; }
  });
  const modalOpenRef = useRef(false);

  const monday = getMonday(anchorDate);
  const weekKey = isoDate(monday);
  const weekDates = Array.from({ length: 7 }, (_, i) => isoDate(addDays(monday, i)));
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

  // 글씨 크게/작게 적용
  useEffect(() => {
    document.documentElement.style.fontSize = bigFont ? "21px" : "17.5px";
    try { localStorage.setItem("cvs-font", bigFont ? "big" : "normal"); } catch { /* ignore */ }
  }, [bigFont]);

  const refresh = useCallback(async () => {
    try {
      if (view === "month") {
        setMonthData(await fetchMonth(monthWeekStarts(year, month)));
      } else {
        const dates = Array.from({ length: 7 }, (_, i) => isoDate(addDays(getMonday(anchorDate), i)));
        const [wk, offs, evs] = await Promise.all([fetchWeek(weekKey), fetchDaysOff(dates), fetchEvents(weekKey)]);
        setWeek(wk);
        setDaysOff(offs);
        setEvents(evs);
      }
      setError("");
    } catch (e) {
      setError(e?.message || "데이터를 불러오지 못했어요.");
    }
  }, [view, weekKey, year, month, anchorDate]);

  // 직원 명단 + 고정근무 불러오기 (+ 색상 반영)
  const loadRoster = useCallback(async () => {
    try {
      const [emps, fixed] = await Promise.all([fetchEmployees(), fetchFixedShifts()]);
      setEmployees(emps);
      setFixedShifts(fixed);
      const overrides = {};
      emps.forEach((e) => { if (e.color) overrides[e.name] = e.color; });
      setColorOverrides(overrides);
    } catch { /* 직원 기능 미사용 시 조용히 무시 */ }
  }, []);

  // 매장 이름 + 직원 명단은 처음 한 번 + 직원/고정근무 변경 실시간 구독
  useEffect(() => {
    let active = true;
    (async () => {
      try { const n = await fetchStoreName(); if (active) setStoreName(n || ""); } catch { /* ignore */ }
    })();
    loadRoster();
    const unsub = subscribeRoster(() => loadRoster());
    return () => { active = false; unsub(); };
  }, [loadRoster]);

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
          const [d, offs, evs] = await Promise.all([fetchWeek(weekKey), fetchDaysOff(weekDates), fetchEvents(weekKey)]);
          if (active) { setWeek(d); setDaysOff(offs); setEvents(evs); }
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
    modalOpenRef.current = !!(modal || specialModal !== null || editingName || calendarOpen || empManagerOpen || dayOffOpen || eventModalOpen || tipsOpen);
  }, [modal, specialModal, editingName, calendarOpen, empManagerOpen, dayOffOpen, eventModalOpen, tipsOpen]);

  const upsertShift = async (s) => {
    setModal(null);
    try {
      if (s.id) await updateShift(s);
      else await insertShift(weekKey, s);
      await refresh();
    } catch (e) { setError(e?.message || "저장에 실패했어요."); }
  };
  const removeShift = async () => {
    const init = modal?.initial;
    setModal(null);
    try {
      if (init?._virtual) {
        // 고정근무 자동 표시분 삭제 = 그 날 휴무 처리 (다시 안 생기게)
        await addDayOff(init._empId, init._date);
      } else if (init?.id) {
        await deleteShift(init.id);
      }
      await refresh();
    } catch (e) { setError(e?.message || "삭제에 실패했어요."); }
  };

  // 시프트 편집 진입 (가상=고정근무면 id 없이 열어 저장 시 실제로 전환)
  const openEdit = (s) => {
    if (s._virtual) {
      setModal({ dayIndex: s.day, initial: { name: s.name, start: s.start, end: s.end, role: s.role, _virtual: true, _empId: s._empId, _date: s._date } });
    } else {
      setModal({ dayIndex: s.day, initial: s });
    }
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

  // 고정근무 자동 반영 — 실제 시프트 + 가상(고정) 병합
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const empByName = Object.fromEntries(employees.map((e) => [e.name, e]));
  const weekOffSet = new Set(daysOff.map((o) => `${o.employee_id}|${o.date}`));
  const weekVirtual = weekDates.flatMap((dateIso, i) => virtualShiftsForDate(dateIso, i, fixedShifts, empById, weekOffSet));
  const mergedWeekShifts = mergeReal(week.shifts, weekVirtual);

  // 월간 병합 (달력 6주 격자의 모든 날짜)
  const monthMergedByDate = {};
  if (view === "month") {
    const monthOffSet = new Set((monthData.daysOff || []).map((o) => `${o.employee_id}|${o.date}`));
    const gridStart = getMonday(new Date(year, month, 1));
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      const key = isoDate(d);
      const real = monthData.shiftsByDate[key] || [];
      const v = virtualShiftsForDate(key, i % 7, fixedShifts, empById, monthOffSet);
      monthMergedByDate[key] = mergeReal(real, v);
    }
  }

  // 인건비 계산 대상 (시프트 + 실제 날짜)
  let laborEntries, includeWeekly, summaryTitle;
  if (view === "month") {
    laborEntries = Object.entries(monthMergedByDate).flatMap(([date, list]) =>
      list.map((s) => ({ name: s.name, start: s.start, end: s.end, date })));
    includeWeekly = true; summaryTitle = "이 달 근무 요약";
  } else if (view === "day") {
    laborEntries = mergedWeekShifts.filter((s) => s.day === dayIndex)
      .map((s) => ({ name: s.name, start: s.start, end: s.end, date: weekDates[dayIndex] }));
    includeWeekly = false; summaryTitle = "이 날 근무 요약";
  } else {
    laborEntries = mergedWeekShifts.map((s) => ({ name: s.name, start: s.start, end: s.end, date: weekDates[s.day] }));
    includeWeekly = true; summaryTitle = "주간 근무 요약";
  }
  const salaryFactor = view === "month" ? 1 : view === "day" ? 1 / 30 : 1 / 4.345;
  const per = computeLabor(laborEntries, empByName, { includeWeekly, salaryFactor });
  const summaryList = Object.entries(per).sort((a, b) => b[1].cost - a[1].cost || b[1].hrs - a[1].hrs);
  const totalCost = summaryList.reduce((a, [, v]) => a + v.cost, 0);
  const totalHrs = summaryList.reduce((a, [, v]) => a + v.hrs, 0);
  const anyMissingWage = summaryList.some(([name]) => {
    const e = empByName[name] || {};
    return e.pay_type === "monthly" ? !e.monthly_pay : !e.wage;
  });
  const won = (n) => "₩" + Math.round(n).toLocaleString();

  // 휴무: 요일별 직원 이름 목록
  const empNameById = Object.fromEntries(employees.map((e) => [e.id, e.name]));
  const offByDay = {};
  daysOff.forEach((o) => {
    const di = weekDates.indexOf(o.date);
    if (di >= 0) (offByDay[di] ||= []).push(empNameById[o.employee_id] || "?");
  });
  const eventsByDay = {};
  events.forEach((e) => { (eventsByDay[e.day] ||= []).push(e); });

  // 타임라인용 days 배열
  const weekDays = DAY_NAMES.map((dn, i) => ({
    dayIndex: i, date: addDays(monday, i), dayName: dn,
    shifts: mergedWeekShifts.filter((s) => s.day === i), special: week.special[i],
    offNames: offByDay[i] || [], events: eventsByDay[i] || [],
  }));
  const dayDays = [{
    dayIndex, date: addDays(monday, dayIndex), dayName: DAY_NAMES[dayIndex],
    shifts: mergedWeekShifts.filter((s) => s.day === dayIndex), special: week.special[dayIndex],
    offNames: offByDay[dayIndex] || [], events: eventsByDay[dayIndex] || [],
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
                <div className="text-sm mt-1" style={{ color: C.sub }}>매장 이름을 누르면 바꿀 수 있어요</div>
              </button>
            )}
          </div>
          <InstallButton />
        </div>

        {/* period nav */}
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-4"
          style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <button onClick={() => go(-1)} className="px-3.5 py-2 rounded-lg font-bold text-base whitespace-nowrap" style={{ background: "#F0EFEA", color: C.ink }}>← 이전</button>
          <div className="text-center">
            <button onClick={() => setCalendarOpen(true)}
              className="font-bold text-base sm:text-lg inline-flex items-center gap-1.5 px-2 py-1 rounded-lg whitespace-nowrap"
              style={{ color: C.ink, background: "#F0EFEA" }}>
              <span>📅</span><span className="whitespace-nowrap">{periodLabel}</span>
            </button>
            <div>
              <button onClick={() => setAnchorDate(new Date())} className="text-xs underline" style={{ color: C.accent }}>오늘로</button>
            </div>
          </div>
          <button onClick={() => go(1)} className="px-3.5 py-2 rounded-lg font-bold text-base whitespace-nowrap" style={{ background: "#F0EFEA", color: C.ink }}>다음 →</button>
        </div>

        {/* view toggle + tools */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#ECEAE2" }}>
            {VIEWS.map(([v, label]) => (
              <button key={v} onClick={() => changeView(v)}
                className="text-base font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap transition"
                style={view === v
                  ? { background: C.card, color: C.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                  : { background: "transparent", color: C.sub }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEmpManagerOpen(true)}
              className="text-base font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap border" style={{ color: C.ink, borderColor: C.line, background: C.card }}>
              👥 직원
            </button>
            {view !== "month" && (
              <>
                <button onClick={() => setDayOffOpen(true)}
                  className="text-base font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap border" style={{ color: C.ink, borderColor: C.line, background: C.card }}>
                  🌴 휴무
                </button>
                <button onClick={() => setEventModalOpen(true)}
                  className="text-base font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap border" style={{ color: C.ink, borderColor: C.line, background: C.card }}>
                  📦 이벤트
                </button>
              </>
            )}
            <button onClick={() => setTipsOpen(true)}
              className="text-base font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap border" style={{ color: "#9A6B00", borderColor: "#F2D98C", background: "#FFF8E6" }}>
              💡 꿀팁
            </button>
            <button onClick={() => setBigFont((v) => !v)}
              className="text-base font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap border" style={{ color: C.ink, borderColor: C.line, background: C.card }}>
              {bigFont ? "🔍 글씨 작게" : "🔍 글씨 크게"}
            </button>
          </div>
        </div>

        {/* share note */}
        <div className="text-sm rounded-lg px-3 py-2.5 mb-4 flex items-center gap-2"
          style={{ background: "#E9F6F3", color: C.accentDark }}>
          <span>👥</span>
          <span>모두 함께 보고 고칠 수 있어요. 바꾸면 자동 저장돼요.</span>
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
                shiftsByDate={monthMergedByDate}
                specialByDate={monthData.specialByDate}
                empByName={empByName}
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
                        <div className="font-bold text-lg" style={{ color: headColor }}>
                          {d.dayName}<span className="text-sm ml-1" style={{ color: C.sub }}>{fmtMD(d.date)}</span>
                        </div>
                        {isToday && <span className="text-sm font-bold" style={{ color: C.accent }}>오늘</span>}
                      </div>
                      <button onClick={() => setSpecialModal(d.dayIndex)}
                        className="text-left text-sm rounded px-2 py-1.5 mb-2 truncate"
                        style={d.special ? { background: "#FFF4DA", color: "#9A6B00", fontWeight: 600 } : { background: "#F4F3EE", color: C.sub }}>
                        {d.special ? `⚑ ${d.special}` : "+ 특이사항"}
                      </button>
                      <div className="flex-1">
                        {dayShifts.map((s) => (
                          <ShiftCard key={s.id} s={s} onClick={() => openEdit(s)} />
                        ))}
                      </div>
                      <button onClick={() => setModal({ dayIndex: d.dayIndex, initial: null })}
                        className="w-full mt-1 py-2 rounded-lg text-base font-semibold border border-dashed"
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
                onEditShift={openEdit}
                onAddShift={(i) => setModal({ dayIndex: i, initial: null })}
                onEditSpecial={(i) => setSpecialModal(i)}
              />
            )}

            {/* legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm" style={{ color: C.sub }}>
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

            {/* summary + 인건비 */}
            {summaryList.length > 0 && (
              <div className="mt-6 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                  <div className="font-bold text-lg" style={{ color: C.ink }}>{summaryTitle}</div>
                  <div className="text-base" style={{ color: C.sub }}>
                    총 {totalHrs % 1 === 0 ? totalHrs : totalHrs.toFixed(1)}시간 · 예상 인건비{" "}
                    <span className="font-bold" style={{ color: C.accentDark }}>{won(totalCost)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {summaryList.map(([name, v]) => {
                    const emp = empByName[name] || {};
                    const monthly = emp.pay_type === "monthly";
                    const wage = emp.wage || 0;
                    const hasPay = monthly ? !!emp.monthly_pay : !!wage;
                    const extras = [];
                    if (v.night > 0) extras.push(`야간 +${won(v.night)}`);
                    if (v.weekly > 0) extras.push(`주휴 +${won(v.weekly)}`);
                    return (
                      <div key={name} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#F8F7F3" }}>
                        <span style={{ width: 10, height: 10, borderRadius: 10, background: personColor(name), flexShrink: 0 }} />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-base truncate" style={{ color: C.ink }}>
                            {name}{monthly && <span className="text-[11px] ml-1 px-1 rounded" style={{ background: "#EDE7F6", color: "#5E35B1" }}>월급제</span>}
                          </div>
                          <div className="text-sm" style={{ color: C.sub }}>
                            {v.count}회 · {v.hrs % 1 === 0 ? v.hrs : v.hrs.toFixed(1)}시간
                            {monthly ? (emp.monthly_pay ? ` · 월급 ${emp.monthly_pay.toLocaleString()}` : "") : (wage ? ` · 시급 ${wage.toLocaleString()}` : "")}
                          </div>
                          <div className="text-base font-bold mt-0.5" style={{ color: hasPay ? C.accentDark : C.sub }}>
                            {hasPay ? won(v.cost) : (monthly ? "월급 미설정" : "시급 미설정")}
                            {monthly && hasPay && <span className="font-normal text-sm" style={{ color: C.sub }}> (이 기간 환산)</span>}
                          </div>
                          {!monthly && extras.length > 0 && (
                            <div className="text-[12px]" style={{ color: C.sub }}>{extras.join(" · ")}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {anyMissingWage && (
                  <div className="text-xs mt-3" style={{ color: C.sub }}>
                    ※ “시급 미설정” 직원은 👥 직원 관리에서 시급을 입력하면 금액에 반영돼요.
                  </div>
                )}
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
          employees={employees}
          onClose={() => setModal(null)}
          onSave={upsertShift}
          onDelete={removeShift}
        />
      )}
      {empManagerOpen && (
        <EmployeeManager
          employees={employees}
          fixedShifts={fixedShifts}
          onChanged={loadRoster}
          onClose={() => setEmpManagerOpen(false)}
        />
      )}
      {dayOffOpen && (
        <DayOffModal
          employees={employees}
          weekDates={weekDates}
          weekLabel={`${fmtMD(monday)} ~ ${fmtMD(addDays(monday, 6))}`}
          daysOff={daysOff}
          onChanged={refresh}
          onClose={() => setDayOffOpen(false)}
        />
      )}
      {eventModalOpen && (
        <EventModal
          weekKey={weekKey}
          weekLabel={`${fmtMD(monday)} ~ ${fmtMD(addDays(monday, 6))}`}
          events={events}
          onChanged={refresh}
          onClose={() => setEventModalOpen(false)}
        />
      )}
      {tipsOpen && <TipsModal onClose={() => setTipsOpen(false)} />}
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
