import { hours, nightHours, getMonday, isoDate, parseLocalDate } from "./dateUtils";

/* ============================================================
 *  인건비 계산
 *  - 기본급 = 근무시간 × 시급
 *  - 야간수당 = (야간 22~06시 근무시간) × 시급 × 0.5   (night_allowance 직원만)
 *  - 주휴수당 = min(주간근로시간,40)/40 × 8 × 시급       (weekly_allowance 직원, 주 15시간 이상)
 *
 *  entries: [{ name, start, end, date }]  date = 그 시프트의 실제 날짜(YYYY-MM-DD)
 *  empByName: { name: {wage, night_allowance, weekly_allowance} }
 *  opts.includeWeekly: 주휴수당 포함 여부(주/월 보기에서 true, 일 보기에서 false)
 * ============================================================ */
export function computeLabor(entries, empByName, opts = {}) {
  const per = {}; // name -> {count, hrs, base, night, weekly, cost}
  const weekHrs = {}; // `${name}|${weekStart}` -> 주간 근로시간

  const ensure = (name) => (per[name] ||= { count: 0, hrs: 0, base: 0, night: 0, weekly: 0, cost: 0 });

  entries.forEach((en) => {
    const emp = empByName[en.name] || {};
    const wage = emp.wage || 0;
    const h = hours(en.start, en.end);
    const p = ensure(en.name);
    p.count++;
    p.hrs += h;
    p.base += h * wage;
    if (emp.night_allowance) p.night += nightHours(en.start, en.end) * wage * 0.5;

    if (en.date) {
      const ws = isoDate(getMonday(parseLocalDate(en.date)));
      weekHrs[`${en.name}|${ws}`] = (weekHrs[`${en.name}|${ws}`] || 0) + h;
    }
  });

  if (opts.includeWeekly) {
    Object.entries(weekHrs).forEach(([key, wh]) => {
      const name = key.slice(0, key.lastIndexOf("|"));
      const emp = empByName[name] || {};
      if (emp.weekly_allowance && wh >= 15) {
        const holidayHrs = (Math.min(wh, 40) / 40) * 8;
        ensure(name).weekly += holidayHrs * (emp.wage || 0);
      }
    });
  }

  Object.values(per).forEach((p) => {
    p.night = Math.round(p.night);
    p.weekly = Math.round(p.weekly);
    p.base = Math.round(p.base);
    p.cost = p.base + p.night + p.weekly;
  });
  return per;
}

// 하루치(달력 셀) 인건비 = 기본 + 야간 (주휴는 주 단위라 제외)
export function dayLabor(shifts, empByName) {
  let cost = 0;
  shifts.forEach((s) => {
    const emp = empByName[s.name] || {};
    const wage = emp.wage || 0;
    cost += hours(s.start, s.end) * wage;
    if (emp.night_allowance) cost += nightHours(s.start, s.end) * wage * 0.5;
  });
  return Math.round(cost);
}
