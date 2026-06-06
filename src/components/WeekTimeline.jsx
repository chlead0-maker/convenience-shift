import { C } from "../lib/constants";
import { fmtMD, isSameDay, personColor, hours } from "../lib/dateUtils";

const HOUR_H = 24;                 // 1시간당 픽셀 높이
const TOTAL_H = 24 * HOUR_H;       // 하루 전체 높이
const GUTTER = 44;                 // 시간 축(왼쪽) 너비
const NIGHT_BG = "rgba(91,91,214,0.10)"; // 야간(22~06) 배경

function pad2(n) { return String(n).padStart(2, "0"); }
function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

// 하루치 시프트를 시간 블록(세그먼트)으로 변환 (자정 넘김은 두 조각으로 분할)
function buildDay(dayShifts) {
  const segs = [];
  const noTime = [];
  dayShifts.forEach((sh) => {
    const s = toMin(sh.start), e = toMin(sh.end);
    if (s == null || e == null) { noTime.push(sh); return; }
    const base = { sh, name: sh.name, role: sh.role, color: personColor(sh.name), label: `${sh.start}~${sh.end}` };
    if (e <= s) {
      segs.push({ ...base, _s: s, _e: 1440 });
      if (e > 0) segs.push({ ...base, _s: 0, _e: e, cont: true });
    } else {
      segs.push({ ...base, _s: s, _e: e });
    }
  });
  layoutLanes(segs);
  return { segs, noTime };
}

// 겹치는 시프트를 좌우로 나눠 배치 (lane 계산)
function layoutLanes(segs) {
  const sorted = [...segs].sort((a, b) => a._s - b._s || a._e - b._e);
  const laneEnds = [];
  sorted.forEach((s) => {
    let lane = laneEnds.findIndex((end) => end <= s._s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(s._e); }
    else laneEnds[lane] = s._e;
    s._lane = lane;
  });
  let cur = [], curEnd = -1;
  const clusters = [];
  sorted.forEach((s) => {
    if (cur.length && s._s >= curEnd) { clusters.push(cur); cur = []; curEnd = -1; }
    cur.push(s); curEnd = Math.max(curEnd, s._e);
  });
  if (cur.length) clusters.push(cur);
  clusters.forEach((cl) => {
    const lanes = Math.max(...cl.map((s) => s._lane)) + 1;
    cl.forEach((s) => { s._lanes = lanes; });
  });
}

/**
 * days: [{ dayIndex, date, dayName, shifts, special }]
 * single: 하루 보기(넓게) 여부
 */
export default function WeekTimeline({ days, today, onEditShift, onAddShift, onEditSpecial, single }) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const colW = single ? "minmax(0, 1fr)" : "minmax(104px, 1fr)";
  const minW = single ? 0 : GUTTER + days.length * 104;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div className="overflow-x-auto">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${GUTTER}px repeat(${days.length}, ${colW})`,
            gridTemplateRows: `auto ${TOTAL_H}px`,
            minWidth: minW,
          }}
        >
          {/* ── 헤더 행 ── */}
          <div className="sticky left-0 z-20" style={{ background: C.card }} />
          {days.map((d) => {
            const isToday = isSameDay(d.date, today);
            const wd = d.dayIndex;
            const headColor = wd === 6 ? "#D81B60" : wd === 5 ? "#3B6EA8" : C.ink;
            const cnt = d.shifts.length;
            const totalH = d.shifts.reduce((a, s) => a + hours(s.start, s.end), 0);
            return (
              <div key={d.dayIndex} className="px-1.5 pt-2 pb-1.5 border-l" style={{
                borderColor: C.line,
                background: isToday ? "#F0FAF8" : "transparent",
              }}>
                <div className="flex items-center justify-center gap-1">
                  <span className="font-bold text-sm" style={{ color: headColor }}>{d.dayName}</span>
                  <span className="text-[11px]" style={{ color: C.sub }}>{fmtMD(d.date)}</span>
                  {isToday && <span className="text-[10px] font-bold px-1 rounded" style={{ background: C.accent, color: "#fff" }}>오늘</span>}
                </div>
                <button
                  onClick={() => onEditSpecial(d.dayIndex)}
                  className="w-full mt-1 text-left text-[11px] rounded px-1.5 py-0.5 truncate"
                  style={d.special
                    ? { background: "#FFF4DA", color: "#9A6B00", fontWeight: 600 }
                    : { background: "#F4F3EE", color: C.sub }}
                >
                  {d.special ? `⚑ ${d.special}` : "+ 특이사항"}
                </button>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px]" style={{ color: C.sub }}>
                    {cnt ? `${cnt}명 · ${totalH % 1 === 0 ? totalH : totalH.toFixed(1)}h` : "–"}
                  </span>
                  <button
                    onClick={() => onAddShift(d.dayIndex)}
                    className="text-[11px] font-bold leading-none px-1.5 py-0.5 rounded"
                    style={{ color: C.accent, border: `1px dashed ${C.accent}` }}
                    aria-label="시프트 추가"
                  >
                    ＋
                  </button>
                </div>
              </div>
            );
          })}

          {/* ── 시간 축(왼쪽) ── */}
          <div className="sticky left-0 z-10 relative border-t" style={{ background: C.card, borderColor: C.line }}>
            {Array.from({ length: 13 }, (_, k) => k * 2).map((h) => (
              <div key={h} className="absolute right-1 text-[10px]" style={{ top: h * HOUR_H - 6, color: C.sub }}>
                {pad2(h)}:00
              </div>
            ))}
          </div>

          {/* ── 요일별 본문(시간 격자 + 블록) ── */}
          {days.map((d) => {
            const { segs, noTime } = buildDay(d.shifts);
            const isToday = isSameDay(d.date, today);
            return (
              <div
                key={d.dayIndex}
                className="relative border-l border-t"
                style={{
                  borderColor: C.line,
                  backgroundImage: `repeating-linear-gradient(to bottom, ${C.line} 0, ${C.line} 1px, transparent 1px, transparent ${HOUR_H}px)`,
                }}
              >
                {/* 야간 음영 (00~06, 22~24) */}
                <div className="absolute inset-x-0 pointer-events-none" style={{ top: 0, height: 6 * HOUR_H, background: NIGHT_BG }} />
                <div className="absolute inset-x-0 pointer-events-none" style={{ top: 22 * HOUR_H, height: 2 * HOUR_H, background: NIGHT_BG }} />

                {/* 시간 미정 시프트 */}
                {noTime.map((sh) => (
                  <button key={sh.id} onClick={() => onEditShift(sh)}
                    className="absolute left-1 right-1 top-1 text-[10px] rounded px-1 py-0.5 truncate text-left"
                    style={{ background: "#EEE", color: C.sub, border: `1px dashed ${C.line}` }}>
                    {sh.name} · 시간미정
                  </button>
                ))}

                {/* 현재 시각 표시선 (오늘만) */}
                {isToday && (
                  <div className="absolute inset-x-0 pointer-events-none z-10" style={{ top: (nowMin / 60) * HOUR_H }}>
                    <div style={{ height: 2, background: "#E8743B" }} />
                  </div>
                )}

                {/* 시프트 블록 */}
                {segs.map((s, idx) => {
                  const top = (s._s / 60) * HOUR_H;
                  const h = Math.max(((s._e - s._s) / 60) * HOUR_H, 15);
                  const lanes = s._lanes || 1;
                  const wPct = 100 / lanes;
                  return (
                    <button
                      key={idx}
                      onClick={() => onEditShift(s.sh)}
                      className="absolute rounded-md overflow-hidden text-left shadow-sm"
                      style={{
                        top: top + 1,
                        height: h - 2,
                        left: `calc(${wPct * s._lane}% + 2px)`,
                        width: `calc(${wPct}% - 4px)`,
                        background: s.color,
                        color: "#fff",
                        padding: "2px 4px",
                        borderLeft: "3px solid rgba(0,0,0,0.22)",
                      }}
                    >
                      <div className="text-[11px] font-bold leading-tight truncate" style={{ textShadow: "0 1px 1px rgba(0,0,0,0.25)" }}>
                        {s.cont ? "↳ " : ""}{s.name}
                      </div>
                      {h >= 30 && (
                        <div className="text-[10px] leading-tight truncate" style={{ opacity: 0.95 }}>{s.label}</div>
                      )}
                      {h >= 48 && s.role && (
                        <div className="text-[10px] leading-tight truncate" style={{ opacity: 0.9 }}>{s.role}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
