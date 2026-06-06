import { C } from "../lib/constants";
import { isoDate, getMonday, addDays, isSameDay, personColor, hours } from "../lib/dateUtils";
import { dayLabor } from "../lib/labor";

const WD = ["월", "화", "수", "목", "금", "토", "일"];
const won = (n) => "₩" + Math.round(n).toLocaleString();

export default function MonthGrid({ anchorDate, today, shiftsByDate, specialByDate, empByName = {}, onPickDay }) {
  const y = anchorDate.getFullYear();
  const m = anchorDate.getMonth();
  const first = new Date(y, m, 1);
  const gridStart = getMonday(first);

  const weeks = [];
  let cur = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) { row.push(new Date(cur)); cur = addDays(cur, 1); }
    weeks.push(row);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7">
        {WD.map((w, i) => (
          <div key={i} className="text-center text-sm font-bold py-2 border-b"
            style={{ color: i === 6 ? "#D81B60" : i === 5 ? "#3B6EA8" : C.sub, borderColor: C.line }}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 격자 */}
      <div className="grid grid-cols-7">
        {weeks.flat().map((date, idx) => {
          const key = isoDate(date);
          const otherMonth = date.getMonth() !== m;
          const isToday = isSameDay(date, today);
          const wd = idx % 7;
          const dateColor = otherMonth ? "#C9C6BD" : (wd === 6 ? "#D81B60" : wd === 5 ? "#3B6EA8" : C.ink);
          const shifts = shiftsByDate[key] || [];
          const special = specialByDate[key];
          const totalH = shifts.reduce((a, s) => a + hours(s.start, s.end), 0);
          const cost = dayLabor(shifts, empByName);
          return (
            <button
              key={idx}
              onClick={() => onPickDay(date)}
              className="text-left p-1.5 border-b border-r flex flex-col"
              style={{
                borderColor: C.line,
                minHeight: 112,
                background: isToday ? "#F0FAF8" : otherMonth ? "#FAF9F6" : C.card,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: dateColor }}>{date.getDate()}</span>
                {special && <span className="text-xs" title={special}>⚑</span>}
              </div>

              <div className="mt-0.5 space-y-0.5 flex-1 overflow-hidden">
                {shifts.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-1">
                    <span style={{ width: 7, height: 7, borderRadius: 7, background: personColor(s.name), flexShrink: 0 }} />
                    <span className="text-[12px] truncate" style={{ color: C.ink }}>
                      {s.start ? s.start.slice(0, 5) + " " : ""}{s.name}
                    </span>
                  </div>
                ))}
                {shifts.length > 3 && (
                  <div className="text-[12px]" style={{ color: C.sub }}>+{shifts.length - 3}명 더</div>
                )}
              </div>

              {shifts.length > 0 && (
                <div className="mt-0.5">
                  <div className="text-[12px]" style={{ color: C.sub }}>
                    {shifts.length}명 · {totalH % 1 === 0 ? totalH : totalH.toFixed(1)}h
                  </div>
                  {cost > 0 && (
                    <div className="text-[13px] font-bold" style={{ color: C.accentDark }}>{won(cost)}</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
