import { useState } from "react";
import { C, DAY_NAMES } from "../lib/constants";

/* ---------- special-day modal ---------- */
export default function SpecialModal({ dayIndex, dateLabel, initial, onClose, onSave }) {
  const [text, setText] = useState(initial || "");
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: C.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold" style={{ color: C.ink }}>특이사항</div>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
        </div>
        <div className="text-sm mb-3" style={{ color: C.sub }}>{DAY_NAMES[dayIndex]}요일 · {dateLabel}</div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예: 물류 입고 / 본사 점검 / 행사"
          className="w-full border rounded-lg px-3 py-2 outline-none mb-4"
          style={{ borderColor: C.line, color: C.ink }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold border"
            style={{ color: C.sub, borderColor: C.line, background: "#fff" }}
          >
            취소
          </button>
          <button
            onClick={() => onSave(text)}
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
