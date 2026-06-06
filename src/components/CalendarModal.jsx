import { useState } from "react";
import { C } from "../lib/constants";
import { getMonday, addDays, isSameDay } from "../lib/dateUtils";

const WD = ["월", "화", "수", "목", "금", "토", "일"];

/* 달력에서 날짜를 누르면 그 날짜가 속한 주(週)로 이동 */
export default function CalendarModal({ selectedMonday, onPick, onClose }) {
  const [view, setView] = useState(() => new Date(selectedMonday));
  const y = view.getFullYear();
  const m = view.getMonth();

  const first = new Date(y, m, 1);
  const gridStart = getMonday(first); // 1일이 포함된 주의 월요일
  const weeks = [];
  let cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    weeks.push(row);
  }

  const today = new Date();
  const selMs = getMonday(selectedMonday).getTime();
  const inSelWeek = (d) => getMonday(d).getTime() === selMs;

  const moveMonth = (delta) => setView(new Date(y, m + delta, 1));

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
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => moveMonth(-1)} className="px-3 py-1.5 rounded-lg font-bold" style={{ background: "#F0EFEA", color: C.ink }}>‹</button>
          <div className="text-lg font-bold" style={{ color: C.ink }}>{y}년 {m + 1}월</div>
          <button onClick={() => moveMonth(1)} className="px-3 py-1.5 rounded-lg font-bold" style={{ background: "#F0EFEA", color: C.ink }}>›</button>
        </div>

        {/* weekday row */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WD.map((w, i) => (
            <div key={w} className="text-center text-xs font-semibold py-1"
              style={{ color: i === 6 ? "#D81B60" : i === 5 ? "#3B6EA8" : C.sub }}>
              {w}
            </div>
          ))}
        </div>

        {/* day grid */}
        <div className="space-y-1">
          {weeks.map((row, wi) => {
            const rowSelected = inSelWeek(row[0]);
            return (
              <div key={wi} className="grid grid-cols-7 gap-1 rounded-lg"
                style={rowSelected ? { background: "#E9F6F3" } : undefined}>
                {row.map((d, di) => {
                  const otherMonth = d.getMonth() !== m;
                  const isToday = isSameDay(d, today);
                  const weekendColor = di === 6 ? "#D81B60" : di === 5 ? "#3B6EA8" : C.ink;
                  return (
                    <button
                      key={di}
                      onClick={() => onPick(d)}
                      className="aspect-square rounded-lg text-sm font-semibold flex items-center justify-center"
                      style={{
                        color: otherMonth ? "#C9C6BD" : weekendColor,
                        background: isToday ? C.accent : "transparent",
                        ...(isToday ? { color: "#fff" } : {}),
                        border: rowSelected && !isToday ? `1px solid ${C.accent}` : "1px solid transparent",
                      }}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={() => onPick(new Date())}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold border"
            style={{ color: C.accent, borderColor: C.accent, background: "#fff" }}>
            오늘로 이동
          </button>
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white"
            style={{ background: C.accent }}>
            닫기
          </button>
        </div>
        <div className="text-xs text-center mt-3" style={{ color: C.sub }}>
          날짜를 누르면 그 주의 표로 이동해요
        </div>
      </div>
    </div>
  );
}
