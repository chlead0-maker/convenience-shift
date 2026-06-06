import React, { useState, useEffect, useCallback, useRef } from "react";

/* ---------- constants ---------- */
const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];
const ROLE_PRESETS = ["오픈", "미들", "마감", "계산", "발주", "청소", "물류"];
const PERSON_COLORS = [
  "#E8743B", "#1B9E77", "#3B6EA8", "#8E44AD", "#D81B60",
  "#00897B", "#5C6BC0", "#C0392B", "#0277BD", "#7CB342",
];
const C = {
  bg: "#F6F4EF",
  card: "#FFFFFF",
  ink: "#2A2A28",
  sub: "#6B6B66",
  line: "#E6E2D8",
  accent: "#0E9F8E",
  accentDark: "#0B7D70",
};
const BAND = {
  morning: { bar: "#F2B705", label: "오전" },
  afternoon: { bar: "#2BA6A6", label: "오후" },
  night: { bar: "#5B5BD6", label: "야간" },
  none: { bar: "#CBD5E1", label: "" },
};
const WEEK_PREFIX = "cvs-shift-week-";

/* ---------- date / util helpers ---------- */
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getMonday(d) {
  const date = new Date(d);
  const wd = date.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtMD(x) {
  return `${x.getMonth() + 1}.${x.getDate()}`;
}
function personColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PERSON_COLORS[h % PERSON_COLORS.length];
}
function band(start) {
  if (!start) return "none";
  const h = parseInt(start.split(":")[0], 10);
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "night";
}
function hours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ---------- storage ---------- */
async function loadWeek(key) {
  try {
    if (!window.storage) return { shifts: [], special: {} };
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : { shifts: [], special: {} };
  } catch {
    return { shifts: [], special: {} };
  }
}
async function saveWeek(key, data) {
  try {
    if (window.storage) await window.storage.set(key, JSON.stringify(data), true);
  } catch {}
}
async function loadStoreName() {
  try {
    if (!window.storage) return "";
    const r = await window.storage.get("cvs-store-name", true);
    return r ? r.value : "";
  } catch {
    return "";
  }
}
async function saveStoreName(v) {
  try {
    if (window.storage) await window.storage.set("cvs-store-name", v, true);
  } catch {}
}

/* ---------- shift modal ---------- */
function ShiftModal({ dayIndex, dateLabel, initial, onClose, onSave, onDelete }) {
  const [name, setName] = useState(initial?.name || "");
  const [start, setStart] = useState(initial?.start || "");
  const [end, setEnd] = useState(initial?.end || "");
  const [role, setRole] = useState(initial?.role || "");
  const [memo, setMemo] = useState(initial?.memo || "");
  const [err, setErr] = useState(false);

  const save = () => {
    if (!name.trim()) { setErr(true); return; }
    onSave({
      id: initial?.id || "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      day: dayIndex,
      name: name.trim(),
      start, end,
      role: role.trim(),
      memo: memo.trim(),
    });
  };

  const inputStyle = { borderColor: C.line, color: C.ink };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ background: C.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-bold" style={{ color: C.ink }}>
              {initial ? "시프트 수정" : "시프트 추가"}
            </div>
            <div className="text-sm" style={{ color: C.sub }}>{DAY_NAMES[dayIndex]}요일 · {dateLabel}</div>
          </div>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
        </div>

        <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>이름</label>
        <input value={name} onChange={(e) => { setName(e.target.value); setErr(false); }}
          placeholder="예: 김알바"
          className="w-full border rounded-lg px-3 py-2 mb-1 outline-none" style={inputStyle} />
        {err && <div className="text-xs mb-2" style={{ color: "#D81B60" }}>이름을 입력해 주세요.</div>}

        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>시작</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>종료</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />
          </div>
        </div>

        <label className="block text-sm font-semibold mb-1 mt-3" style={{ color: C.ink }}>역할</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {ROLE_PRESETS.map((r) => {
            const on = role === r;
            return (
              <button key={r} onClick={() => setRole(on ? "" : r)}
                className="text-sm px-3 py-1 rounded-full border transition"
                style={on
                  ? { background: C.accent, color: "#fff", borderColor: C.accent }
                  : { background: "#fff", color: C.sub, borderColor: C.line }}>
                {r}
              </button>
            );
          })}
        </div>
        <input value={role} onChange={(e) => setRole(e.target.value)}
          placeholder="직접 입력도 가능"
          className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />

        <label className="block text-sm font-semibold mb-1 mt-3" style={{ color: C.ink }}>메모</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2}
          placeholder="예: 30분 일찍 출근 / 교육 예정"
          className="w-full border rounded-lg px-3 py-2 outline-none resize-none" style={inputStyle} />

        <div className="flex gap-2 mt-5">
          {initial && (
            <button onClick={() => onDelete(initial.id)}
              className="px-4 py-2.5 rounded-lg font-semibold border"
              style={{ color: "#C0392B", borderColor: "#F3CFC9", background: "#FCF1EF" }}>
              삭제
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold border"
            style={{ color: C.sub, borderColor: C.line, background: "#fff" }}>
            취소
          </button>
          <button onClick={save}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white"
            style={{ background: C.accent }}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- special-day modal ---------- */
function SpecialModal({ dayIndex, dateLabel, initial, onClose, onSave }) {
  const [text, setText] = useState(initial || "");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }} onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: C.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold" style={{ color: C.ink }}>특이사항</div>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
        </div>
        <div className="text-sm mb-3" style={{ color: C.sub }}>{DAY_NAMES[dayIndex]}요일 · {dateLabel}</div>
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder="예: 물류 입고 / 본사 점검 / 행사"
          className="w-full border rounded-lg px-3 py-2 outline-none mb-4"
          style={{ borderColor: C.line, color: C.ink }} />
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold border"
            style={{ color: C.sub, borderColor: C.line, background: "#fff" }}>취소</button>
          <button onClick={() => onSave(text)}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white"
            style={{ background: C.accent }}>저장</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- shift card ---------- */
function ShiftCard({ s, onClick }) {
  const b = BAND[band(s.start)];
  const pc = personColor(s.name);
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-lg mb-2 overflow-hidden flex shadow-sm hover:shadow transition"
      style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <div style={{ width: 5, background: b.bar, flexShrink: 0 }} />
      <div className="px-2.5 py-2 w-full">
        <div className="flex items-center gap-1.5">
          <span style={{ width: 9, height: 9, borderRadius: 9, background: pc, flexShrink: 0 }} />
          <span className="font-bold text-sm truncate" style={{ color: C.ink }}>{s.name}</span>
        </div>
        {(s.start || s.end) && (
          <div className="text-xs mt-0.5" style={{ color: C.sub }}>
            {s.start || "?"} ~ {s.end || "?"}
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {s.role && (
            <span className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "#F0EFEA", color: C.sub }}>{s.role}</span>
          )}
        </div>
        {s.memo && <div className="text-xs mt-1 italic" style={{ color: C.sub }}>※ {s.memo}</div>}
      </div>
    </button>
  );
}

/* ---------- main app ---------- */
export default function App() {
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [week, setWeek] = useState({ shifts: [], special: {} });
  const [storeName, setStoreName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);       // { dayIndex, initial }
  const [specialModal, setSpecialModal] = useState(null); // dayIndex
  const modalOpenRef = useRef(false);

  const weekKey = WEEK_PREFIX + isoDate(monday);
  const today = new Date();

  const refresh = useCallback(async () => {
    const d = await loadWeek(weekKey);
    setWeek(d || { shifts: [], special: {} });
  }, [weekKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const [d, n] = await Promise.all([loadWeek(weekKey), loadStoreName()]);
      if (!active) return;
      setWeek(d || { shifts: [], special: {} });
      setStoreName(n || "");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [weekKey]);

  useEffect(() => {
    const id = setInterval(() => { if (!modalOpenRef.current) refresh(); }, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    modalOpenRef.current = !!(modal || specialModal !== null || editingName);
  }, [modal, specialModal, editingName]);

  const persist = async (next) => {
    setWeek(next);
    await saveWeek(weekKey, next);
  };
  const upsertShift = async (s) => {
    const exists = week.shifts.some((x) => x.id === s.id);
    const shifts = exists ? week.shifts.map((x) => (x.id === s.id ? s : x)) : [...week.shifts, s];
    await persist({ ...week, shifts });
    setModal(null);
  };
  const deleteShift = async (id) => {
    await persist({ ...week, shifts: week.shifts.filter((x) => x.id !== id) });
    setModal(null);
  };
  const setSpecial = async (day, text) => {
    const special = { ...week.special };
    if (text && text.trim()) special[day] = text.trim();
    else delete special[day];
    await persist({ ...week, special });
    setSpecialModal(null);
  };

  const commitName = async () => {
    setStoreName(nameDraft);
    setEditingName(false);
    await saveStoreName(nameDraft);
  };

  // per-person summary
  const summary = {};
  week.shifts.forEach((s) => {
    if (!summary[s.name]) summary[s.name] = { count: 0, hrs: 0 };
    summary[s.name].count++;
    summary[s.name].hrs += hours(s.start, s.end);
  });
  const summaryList = Object.entries(summary).sort((a, b) => b[1].hrs - a[1].hrs);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'IBM Plex Sans KR', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Do+Hyeon&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap');`}</style>

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
          <span>이 표는 공유받은 모든 직원이 함께 보고 수정할 수 있어요. 변경은 자동 저장됩니다.</span>
        </div>

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
                    <div key={name} className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: "#F8F7F3" }}>
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
          onDelete={deleteShift}
        />
      )}
      {specialModal !== null && (
        <SpecialModal
          dayIndex={specialModal}
          dateLabel={fmtMD(addDays(monday, specialModal))}
          initial={week.special[specialModal] || ""}
          onClose={() => setSpecialModal(null)}
          onSave={(t) => setSpecial(specialModal, t)}
        />
      )}
    </div>
  );
}
