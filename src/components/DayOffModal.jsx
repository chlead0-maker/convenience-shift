import { useState } from "react";
import { C, DAY_NAMES } from "../lib/constants";
import { addDayOff, removeDayOff } from "../lib/db";

/**
 * weekDates: 이번 주 7일의 "YYYY-MM-DD" 배열 (월~일)
 * daysOff: 이번 주 days_off 행들 [{id, employee_id, date}]
 */
export default function DayOffModal({ employees, weekDates, weekLabel, daysOff, onClose, onChanged }) {
  const active = employees.filter((e) => e.active !== false);
  const [empId, setEmpId] = useState(active[0]?.id || null);
  const [busy, setBusy] = useState(false);

  const offRow = (eid, date) => daysOff.find((o) => o.employee_id === eid && o.date === date);

  const toggle = async (date) => {
    if (!empId) return;
    setBusy(true);
    try {
      const existing = offRow(empId, date);
      if (existing) await removeDayOff(existing.id);
      else await addDayOff(empId, date);
      await onChanged();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ background: C.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg font-bold" style={{ color: C.ink }}>🌴 휴무 지정</div>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
        </div>
        <div className="text-sm mb-4" style={{ color: C.sub }}>{weekLabel} · 쉬는 요일을 누르세요</div>

        {active.length === 0 ? (
          <div className="text-sm text-center py-6" style={{ color: C.sub }}>
            먼저 “직원 관리”에서 직원을 등록하세요.
          </div>
        ) : (
          <>
            {/* 직원 선택 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {active.map((e) => (
                <button key={e.id} onClick={() => setEmpId(e.id)}
                  className="text-sm px-3 py-1.5 rounded-full border flex items-center gap-1.5"
                  style={empId === e.id
                    ? { background: C.accent, color: "#fff", borderColor: C.accent }
                    : { background: "#fff", color: C.ink, borderColor: C.line }}>
                  <span style={{ width: 10, height: 10, borderRadius: 10, background: e.color || "#CBD5E1" }} />
                  {e.name}
                </button>
              ))}
            </div>

            {/* 요일 토글 */}
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_NAMES.map((dn, i) => {
                const date = weekDates[i];
                const off = !!offRow(empId, date);
                const wknd = i === 6 ? "#D81B60" : i === 5 ? "#3B6EA8" : C.ink;
                return (
                  <button key={i} onClick={() => toggle(date)} disabled={busy}
                    className="rounded-lg py-2 flex flex-col items-center"
                    style={off
                      ? { background: "#FCEEE9", border: "1.5px solid #E8743B" }
                      : { background: "#F8F7F3", border: `1px solid ${C.line}` }}>
                    <span className="text-xs font-bold" style={{ color: off ? "#C0392B" : wknd }}>{dn}</span>
                    <span className="text-[15px]">{off ? "🌴" : "·"}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs mt-3" style={{ color: C.sub }}>
              휴무로 표시된 날은 “고정근무 채우기”에서 자동으로 제외돼요.
            </div>
          </>
        )}

        <button onClick={onClose}
          className="w-full mt-5 px-4 py-2.5 rounded-lg font-semibold text-white" style={{ background: C.accent }}>
          완료
        </button>
      </div>
    </div>
  );
}
