import { hours, nightHours, getMonday, isoDate, parseLocalDate } from "./dateUtils";

/* ============================================================
 *  인건비 계산
 *  [시급제]
 *   - 기본급 = 근무시간 × 시급
 *   - 야간수당 = (야간 22~06시 근무시간) × 시급 × 0.5  (night_allowance)
 *   - 주휴수당 = min(주간근로시간,40)/40 × 8 × 시급      (weekly_allowance, 주 15h+)
 *  [월급제]
 *   - 월급을 기간에 맞게 환산(opts.salaryFactor: 월=1, 주=1/4.345, 일=1/30)
 *
 *  entries: [{ name, start, end, date }]
 *  empByName: { name: {wage, pay_type, monthly_pay, night_allowance, weekly_allowance} }
 *  opts.includeWeekly: 주휴수당 포함 여부
 *  opts.salaryFactor: 월급제 환산 계수
 * ============================================================ */
export function computeLabor(entries, empByName, opts = {}) {
  const salaryFactor = opts.salaryFactor ?? 1;
  const per = {};
  const weekHrs = {};
  const ensure = (name) => (per[name] ||= { count: 0, hrs: 0, base: 0, night: 0, weekly: 0, salary: 0, monthly: false, cost: 0 });

  entries.forEach((en) => {
    const emp = empByName[en.name] || {};
    const wage = emp.wage || 0;
    const h = hours(en.start, en.end);
    const p = ensure(en.name);
    p.count++;
    p.hrs += h;
    if (emp.pay_type === "monthly") {
      p.monthly = true; // 금액은 아래에서 한 번만 환산
    } else {
      p.base += h * wage;
      if (emp.night_allowance) p.night += nightHours(en.start, en.end) * wage * 0.5;
      if (en.date) {
        const ws = isoDate(getMonday(parseLocalDate(en.date)));
        weekHrs[`${en.name}|${ws}`] = (weekHrs[`${en.name}|${ws}`] || 0) + h;
      }
    }
  });

  if (opts.includeWeekly) {
    Object.entries(weekHrs).forEach(([key, wh]) => {
      const name = key.slice(0, key.lastIndexOf("|"));
      const emp = empByName[name] || {};
      if (emp.pay_type !== "monthly" && emp.weekly_allowance && wh >= 15) {
        ensure(name).weekly += (Math.min(wh, 40) / 40) * 8 * (emp.wage || 0);
      }
    });
  }

  Object.entries(per).forEach(([name, p]) => {
    if (p.monthly) {
      const emp = empByName[name] || {};
      p.salary = Math.round((emp.monthly_pay || 0) * salaryFactor);
      p.cost = p.salary;
    } else {
      p.base = Math.round(p.base);
      p.night = Math.round(p.night);
      p.weekly = Math.round(p.weekly);
      p.cost = p.base + p.night + p.weekly;
    }
  });
  return per;
}

// 하루치(달력 셀) 인건비 = 기본 + 야간 (+ 월급제는 월급/30)
export function dayLabor(shifts, empByName) {
  let cost = 0;
  const monthlySeen = new Set();
  shifts.forEach((s) => {
    const emp = empByName[s.name] || {};
    if (emp.pay_type === "monthly") {
      if (!monthlySeen.has(s.name)) {
        monthlySeen.add(s.name);
        cost += (emp.monthly_pay || 0) / 30;
      }
      return;
    }
    const wage = emp.wage || 0;
    cost += hours(s.start, s.end) * wage;
    if (emp.night_allowance) cost += nightHours(s.start, s.end) * wage * 0.5;
  });
  return Math.round(cost);
}
