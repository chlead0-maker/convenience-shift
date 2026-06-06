import { useState } from "react";
import { C, DAY_NAMES } from "../lib/constants";
import { insertEvent, updateEvent, deleteEvent } from "../lib/db";

const PRESETS = ["📦 물류 입고", "🚚 발주", "🧹 대청소", "🎉 행사", "🔧 점검", "💰 정산"];
const EVENT_COLOR = "#C0392B";

export default function EventModal({ weekKey, weekLabel, events, onChanged, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [days, setDays] = useState([]);     // 추가용 다중 요일
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [repeat, setRepeat] = useState(false); // 매주 반복
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const resetForm = () => { setEditingId(null); setDays([]); setTime(""); setTitle(""); setRepeat(false); setErr(""); };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setDays([ev.day]);
    setTime(ev.time || "");
    setTitle(ev.title);
    setRepeat(ev.repeat === "weekly");
    setErr("");
  };

  const submit = async () => {
    if (!title.trim()) { setErr("내용을 입력하세요."); return; }
    if (days.length === 0) { setErr("요일을 선택하세요."); return; }
    setBusy(true);
    try {
      if (editingId) {
        await updateEvent({ id: editingId, day: days[0], time, title: title.trim(), repeat: repeat ? "weekly" : "none" });
      } else {
        for (const d of days) {
          await insertEvent({ week_start: weekKey, day: d, time, title: title.trim(), color: EVENT_COLOR, repeat: repeat ? "weekly" : "none" });
        }
      }
      resetForm();
      await onChanged();
    } catch (e) { setErr(e?.message || "저장 실패"); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    setBusy(true);
    try { await deleteEvent(id); if (editingId === id) resetForm(); await onChanged(); }
    finally { setBusy(false); }
  };

  const toggleDay = (d) => {
    if (editingId) { setDays([d]); return; } // 수정 중엔 단일 요일
    setDays((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);
  };

  const inputStyle = { borderColor: C.line, color: C.ink };
  const sorted = [...events].sort((a, b) => a.day - b.day || (a.time || "").localeCompare(b.time || ""));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ background: C.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg font-bold" style={{ color: C.ink }}>📦 이벤트 / 특이사항</div>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
        </div>
        <div className="text-sm mb-4" style={{ color: C.sub }}>{weekLabel} · 물류 입고·행사 등을 시간에 표시해요</div>

        {/* 기존 이벤트 (누르면 수정) */}
        {sorted.length > 0 && (
          <div className="space-y-1 mb-4">
            {sorted.map((ev) => (
              <div key={ev.id}
                className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5"
                style={{ background: editingId === ev.id ? "#E9F6F3" : "#F4F3EE" }}>
                <button onClick={() => startEdit(ev)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <span className="font-semibold" style={{ color: C.ink }}>{DAY_NAMES[ev.day]}</span>
                  {ev.repeat === "weekly" && <span title="매주 반복">🔁</span>}
                  {ev.time && <span style={{ color: EVENT_COLOR, fontWeight: 600 }}>{ev.time}</span>}
                  <span className="truncate" style={{ color: C.ink }}>{ev.title}</span>
                </button>
                <button onClick={() => del(ev.id)} className="text-sm" style={{ color: "#C0392B" }}>삭제</button>
              </div>
            ))}
          </div>
        )}

        {/* 추가/수정 폼 */}
        <div className="rounded-lg p-3" style={{ background: "#FAF9F6", border: `1px solid ${C.line}` }}>
          <div className="text-xs font-semibold mb-2" style={{ color: editingId ? C.accent : C.sub }}>
            {editingId ? "✏️ 이벤트 수정 중" : "새 이벤트 추가"}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DAY_NAMES.map((dn, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className="text-sm w-9 h-9 rounded-full border"
                style={days.includes(i) ? { background: C.accent, color: "#fff", borderColor: C.accent } : { background: "#fff", color: C.sub, borderColor: C.line }}>
                {dn}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="border rounded-lg px-2 py-2 outline-none" style={{ ...inputStyle, width: 120 }} />
            <input value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }}
              placeholder="예: 물류 입고" className="flex-1 border rounded-lg px-3 py-2 outline-none" style={inputStyle} />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setTitle(p)}
                className="text-xs px-2 py-1 rounded-full border" style={{ background: "#fff", color: C.sub, borderColor: C.line }}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => setRepeat((v) => !v)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 border text-sm mb-2"
            style={{ borderColor: repeat ? C.accent : C.line, background: repeat ? "#E9F6F3" : "#fff" }}>
            <span style={{ color: C.ink }}>🔁 매주 반복</span>
            <span className="font-bold" style={{ color: repeat ? C.accent : C.sub }}>{repeat ? "반복" : "이번 주만"}</span>
          </button>
          <div className="text-[11px] mb-2" style={{ color: C.sub }}>시간을 비우면 그 날 종일 표시돼요.</div>
          {err && <div className="text-xs mb-2" style={{ color: "#D81B60" }}>{err}</div>}
          <div className="flex gap-2">
            {editingId && (
              <button onClick={resetForm} className="px-3 py-2 rounded-lg font-semibold text-sm border"
                style={{ color: C.sub, borderColor: C.line, background: "#fff" }}>취소</button>
            )}
            <button onClick={submit} disabled={busy}
              className="flex-1 py-2 rounded-lg font-semibold text-sm text-white" style={{ background: C.accent }}>
              {editingId ? "수정 저장" : "＋ 이벤트 추가"}
            </button>
          </div>
        </div>

        <button onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 rounded-lg font-semibold border"
          style={{ color: C.sub, borderColor: C.line, background: "#fff" }}>닫기</button>
      </div>
    </div>
  );
}
