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
} from "./lib/db";
import ShiftCard from "./components/ShiftCard";
import ShiftModal from "./components/ShiftModal";
import SpecialModal from "./components/SpecialModal";
import SetupNotice from "./components/SetupNotice";
import InstallButton from "./components/InstallButton";

export default function App() {
  // Supabase 키가 아직 없으면 설정 안내 화면
  if (!isSupabaseConfigured) return <SetupNotice />;

  return <Scheduler />;
}

function Scheduler() {
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [week, setWeek] = useState({ shifts: [], special: {} });
  const [storeName, setStoreName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);              // { dayIndex, initial }
  const [specialModal, setSpecialModal] = useState(null); // dayIndex
  const modalOpenRef = useRef(false);

  const weekKey = isoDate(monday); // week_start (그 주 월요일 날짜)
  const today = new Date();

  const refresh = useCallback(async () => {
    try {
      const d = await fetchWeek(weekKey);
      setWeek(d || { shifts: [], special: {} });
      setError("");
    } catch (e) {
      setError(e?.message || "데이터를 불러오지 못했어요.");
    }
  }, [weekKey]);

  // 주가 바뀔 때마다 초기 로드
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const [d, n] = await Promise.all([fetchWeek(weekKey), fetchStoreName()]);
        if (!active) return;
        setWeek(d || { shifts: [], special: {} });
        setStoreName(n || "");
        setError("");
      } catch (e) {
        if (active) setError(e?.message || "데이터를 불러오지 못했어요.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [weekKey]);

  // 실시간 구독: 다른 사람이 수정하면 자동 갱신 (앱을 보고 있는 동안)
  useEffect(() => {
    const unsubscribe = subscribeWeek(weekKey, () => {
      if (!modalOpenRef.current) refresh();
    });
    return unsubscribe;
  }, [weekKey, refresh]);

  // 안전장치: 앱으로 돌아왔을 때 + 주기적으로 자동 갱신
  // (모바일은 화면을 끄거나 다른 앱으로 가면 실시간 연결이 끊겨,
  //  복귀하는 순간 최신 상태로 맞춰줄 필요가 있음)
  useEffect(() => {
    const syncIfVisible = () => {
      if (document.visibilityState === "visible" && !modalOpenRef.current) refresh();
    };
    document.addEventListener("visibilitychange", syncIfVisible);
    window.addEventListener("focus", syncIfVisible);
    const id = setInterval(syncIfVisible, 15000);
    return () => {
      document.removeEventListener("visibilitychange", syncIfVisible);
      window.removeEventListener("focus", syncIfVisible);
      clearInterval(id);
    };
  }, [refresh]);

  useEffect(() => {
    modalOpenRef.current = !!(modal || specialModal !== null || editingName);
  }, [modal, specialModal, editingName]);

  const upsertShift = async (s) => {
    setModal(null);
    try {
      if (s.id) await updateShift(s);
      else await insertShift(weekKey, s);
      await refresh();
    } catch (e) {
      setError(e?.message || "저장에 실패했어요.");
    }
  };

  const removeShift = async (id) => {
    setModal(null);
    try {
      await deleteShift(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "삭제에 실패했어요.");
    }
  };

  const handleSpecial = async (day, text) => {
    setSpecialModal(null);
    try {
      await dbSetSpecial(weekKey, day, text);
      await refresh();
    } catch (e) {
      setError(e?.message || "특이사항 저장에 실패했어요.");
    }
  };

  const commitName = async () => {
    const v = nameDraft.trim();
    setStoreName(v);
    setEditingName(false);
    try {
      await saveStoreName(v);
    } catch (e) {
      setError(e?.message || "매장 이름 저장에 실패했어요.");
    }
  };

  // 직원별 주간 근무 요약
  const summary = {};
  week.shifts.forEach((s) => {
    if (!summary[s.name]) summary[s.name] = { count: 0, hrs: 0 };
    summary[s.name].count++;
    summary[s.name].hrs += hours(s.start, s.end);
  });
  const summaryList = Object.entries(summary).sort((a, b) => b[1].hrs - a[1].hrs);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'IBM Plex Sans KR', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-5">
        {/* header */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            {editingName ? (
              <div className="flex gap-2 items-center">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && commitName()}
                  placeholder="매장 이름"
                  className="border rounded-lg px-3 py-1.5 text-lg outline-none"
                  style={{ borderColor: C.line, color: C.ink }}
                />
                <button
                  onClick={commitName}
                  className="px-3 py-1.5 rounded-lg text-white font-semibold"
                  style={{ background: C.accent }}
                >
                  확인
                </button>
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

        {/* week nav */}
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-4"
          style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <button onClick={() => setMonday(addDays(monday, -7))}
            className="px-3 py-1.5 rounded-lg font-bold" style={{ background: "#F0EFEA", color: C.ink }}>← 이전</button>
          <div className="text-center">
            <div className="font-bold text-base sm:text-lg" style={{ color: C.ink }}>
              {fmtMD(monday)} ~ {fmtMD(addDays(monday, 6))}
            </div>
            <button onClick={() => setMonday(getMonday(new Date()))}
              className="text-xs underline" style={{ color: C.accent }}>이번 주로</button>
          </div>
          <button onClick={() => setMonday(addDays(monday, 7))}
            className="px-3 py-1.5 rounded-lg font-bold" style={{ background: "#F0EFEA", color: C.ink }}>다음 →</button>
        </div>

        {/* share note */}
        <div className="text-xs rounded-lg px-3 py-2 mb-4 flex items-center gap-2"
          style={{ background: "#E9F6F3", color: C.accentDark }}>
          <span>👥</span>
          <span>이 표는 공유받은 모든 직원이 함께 보고 수정할 수 있어요. 변경은 자동 저장·실시간 반영됩니다.</span>
        </div>

        {/* error */}
        {error && (
          <div className="text-xs rounded-lg px-3 py-2 mb-4" style={{ background: "#FCF1EF", color: "#C0392B" }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20" style={{ color: C.sub }}>불러오는 중…</div>
        ) : (
          <>
            {/* grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {DAY_NAMES.map((dn, i) => {
                const date = addDays(monday, i);
                const dayShifts = week.shifts
                  .filter((s) => s.day === i)
                  .sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));
                const isToday = isSameDay(date, today);
                const headColor = i === 6 ? "#D81B60" : i === 5 ? "#3B6EA8" : C.ink;
                return (
                  <div key={i} className="rounded-xl p-2.5 flex flex-col"
                    style={{
                      background: C.card,
                      border: isToday ? `2px solid ${C.accent}` : `1px solid ${C.line}`,
                      minHeight: 130,
                    }}>
                    <div className="flex items-baseline justify-between mb-1">
                      <div className="font-bold" style={{ color: headColor }}>
                        {dn}<span className="text-xs ml-1" style={{ color: C.sub }}>{fmtMD(date)}</span>
                      </div>
                      {isToday && <span className="text-xs font-bold" style={{ color: C.accent }}>오늘</span>}
                    </div>

                    {/* special day */}
                    <button onClick={() => setSpecialModal(i)}
                      className="text-left text-xs rounded px-2 py-1 mb-2 truncate"
                      style={week.special[i]
                        ? { background: "#FFF4DA", color: "#9A6B00", fontWeight: 600 }
                        : { background: "#F4F3EE", color: C.sub }}>
                      {week.special[i] ? `⚑ ${week.special[i]}` : "+ 특이사항"}
                    </button>

                    <div className="flex-1">
                      {dayShifts.map((s) => (
                        <ShiftCard key={s.id} s={s} onClick={() => setModal({ dayIndex: i, initial: s })} />
                      ))}
                    </div>

                    <button onClick={() => setModal({ dayIndex: i, initial: null })}
                      className="w-full mt-1 py-1.5 rounded-lg text-sm font-semibold border border-dashed"
                      style={{ color: C.accent, borderColor: C.accent }}>+ 시프트</button>
                  </div>
                );
              })}
            </div>

            {/* legend */}
            <div className="flex flex-wrap gap-3 mt-4 text-xs" style={{ color: C.sub }}>
              {Object.values(BAND).filter((b) => b.label).map((b) => (
                <span key={b.label} className="flex items-center gap-1.5">
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: b.bar }} /> {b.label}
                </span>
              ))}
            </div>

            {/* summary */}
            {summaryList.length > 0 && (
              <div className="mt-6 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="font-bold mb-3" style={{ color: C.ink }}>이번 주 근무 요약</div>
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
