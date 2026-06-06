import { useState } from "react";
import { C, DAY_NAMES, ROLE_PRESETS } from "../lib/constants";

/* ---------- shift add/edit modal ---------- */
export default function ShiftModal({ dayIndex, dateLabel, initial, employees = [], onClose, onSave, onDelete }) {
  const [name, setName] = useState(initial?.name || "");
  const [start, setStart] = useState(initial?.start || "");
  const [end, setEnd] = useState(initial?.end || "");
  const [role, setRole] = useState(initial?.role || "");
  const [memo, setMemo] = useState(initial?.memo || "");
  const [err, setErr] = useState(false);

  const save = () => {
    if (!name.trim()) { setErr(true); return; }
    onSave({
      id: initial?.id,
      day: dayIndex,
      name: name.trim(),
      start,
      end,
      role: role.trim(),
      memo: memo.trim(),
    });
  };

  const inputStyle = { borderColor: C.line, color: C.ink };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ background: C.card }}
        onClick={(e) => e.stopPropagation()}
      >
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
        {employees.filter((e) => e.active !== false).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {employees.filter((e) => e.active !== false).map((e) => (
              <button key={e.id} type="button"
                onClick={() => { setName(e.name); setErr(false); }}
                className="text-sm px-2.5 py-1 rounded-full border flex items-center gap-1.5"
                style={name === e.name
                  ? { background: C.accent, color: "#fff", borderColor: C.accent }
                  : { background: "#fff", color: C.ink, borderColor: C.line }}>
                <span style={{ width: 9, height: 9, borderRadius: 9, background: e.color || "#CBD5E1" }} />
                {e.name}
              </button>
            ))}
          </div>
        )}
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setErr(false); }}
          placeholder="예: 김알바 (직접 입력도 가능)"
          className="w-full border rounded-lg px-3 py-2 mb-1 outline-none"
          style={inputStyle}
        />
        {err && <div className="text-xs mb-2" style={{ color: "#D81B60" }}>이름을 입력해 주세요.</div>}

        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>시작</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none"
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>종료</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        <label className="block text-sm font-semibold mb-1 mt-3" style={{ color: C.ink }}>역할</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {ROLE_PRESETS.map((r) => {
            const on = role === r;
            return (
              <button
                key={r}
                onClick={() => setRole(on ? "" : r)}
                className="text-sm px-3 py-1 rounded-full border transition"
                style={on
                  ? { background: C.accent, color: "#fff", borderColor: C.accent }
                  : { background: "#fff", color: C.sub, borderColor: C.line }}
              >
                {r}
              </button>
            );
          })}
        </div>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="직접 입력도 가능"
          className="w-full border rounded-lg px-3 py-2 outline-none"
          style={inputStyle}
        />

        <label className="block text-sm font-semibold mb-1 mt-3" style={{ color: C.ink }}>메모</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="예: 30분 일찍 출근 / 교육 예정"
          className="w-full border rounded-lg px-3 py-2 outline-none resize-none"
          style={inputStyle}
        />

        <div className="flex gap-2 mt-5">
          {initial && (
            <button
              onClick={() => onDelete(initial.id)}
              className="px-4 py-2.5 rounded-lg font-semibold border"
              style={{ color: "#C0392B", borderColor: "#F3CFC9", background: "#FCF1EF" }}
            >
              삭제
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold border"
            style={{ color: C.sub, borderColor: C.line, background: "#fff" }}
          >
            취소
          </button>
          <button
            onClick={save}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white"
            style={{ background: C.accent }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
