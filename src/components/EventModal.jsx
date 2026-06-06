import { useState } from "react";
import { C, DAY_NAMES } from "../lib/constants";
import { insertEvent, deleteEvent } from "../lib/db";

const PRESETS = ["📦 물류 입고", "🚚 발주", "🧹 대청소", "🎉 행사", "🔧 점검", "💰 정산"];
const EVENT_COLOR = "#C0392B";

/**
 * weekKey: 이번 주 week_start
 * weekLabel: 표시용
 * events: 이번 주 events 목록
 */
export default function EventModal({ weekKey, weekLabel, events, onChanged, onClose }) {
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const add = async () => {
    if (!title.trim()) { setErr("내용을 입력하세요."); return; }
    setBusy(true);
    try {
      await insertEvent({ week_start: weekKey, day, time, title: title.trim(), color: EVENT_COLOR });
      setTitle(""); setTime("");
      await onChanged();
    } catch (e) { setErr(e?.message || "저장 실패"); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    setBusy(true);
    try { await deleteEvent(id); await onChanged(); }
    finally { setBusy(false); }
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

        {/* 기존 이벤트 */}
        {sorted.length > 0 && (
          <div className="space-y-1 mb-4">
            {sorted.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5" style={{ background: "#F4F3EE" }}>
                <span className="font-semibold" style={{ color: C.ink }}>{DAY_NAMES[ev.day]}</span>
                {ev.time && <span style={{ color: EVENT_COLOR, fontWeight: 600 }}>{ev.time}</span>}
                <span className="truncate" style={{ color: C.ink }}>{ev.title}</span>
                <button onClick={() => del(ev.id)} className="ml-auto text-sm" style={{ color: "#C0392B" }}>삭제</button>
              </div>
            ))}
          </div>
        )}

        {/* 추가 폼 */}
        <div className="rounded-lg p-3" style={{ background: "#FAF9F6", border: `1px solid ${C.line}` }}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DAY_NAMES.map((dn, i) => (
              <button key={i} onClick={() => setDay(i)}
                className="text-sm w-9 h-9 rounded-full border"
                style={day === i ? { background: C.accent, color: "#fff", borderColor: C.accent } : { background: "#fff", color: C.sub, borderColor: C.line }}>
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
          <div className="text-[11px] mb-2" style={{ color: C.sub }}>시간을 비우면 그 날 종일 표시돼요.</div>
          {err && <div className="text-xs mb-2" style={{ color: "#D81B60" }}>{err}</div>}
          <button onClick={add} disabled={busy}
            className="w-full py-2 rounded-lg font-semibold text-sm text-white" style={{ background: C.accent }}>
            ＋ 이벤트 추가
          </button>
        </div>

        <button onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 rounded-lg font-semibold border"
          style={{ color: C.sub, borderColor: C.line, background: "#fff" }}>닫기</button>
      </div>
    </div>
  );
}
