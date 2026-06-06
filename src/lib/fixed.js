/* ============================================================
 *  고정근무 자동 반영
 *  - 직원의 고정근무(fixed_shifts)를 화면에 '가상 시프트'로 생성해
 *    실제 시프트와 합쳐서 보여줍니다. (별도 '채우기' 불필요)
 *  - 같은 사람+같은 날에 실제 시프트가 있으면 가상은 숨김(수동 우선)
 *  - 휴무일 / 첫 근무일(입사일) 이전 / 숨김 직원은 제외
 * ============================================================ */

// 한 날짜의 고정근무 가상 시프트
export function virtualShiftsForDate(dateIso, dayIdx, fixedShifts, empById, offSet) {
  const out = [];
  fixedShifts.forEach((f) => {
    if (f.day !== dayIdx) return;
    const emp = empById[f.employee_id];
    if (!emp || emp.active === false) return;
    const startDate = emp.first_work_date || emp.join_date;
    if (startDate && dateIso < startDate) return;
    if (offSet.has(`${f.employee_id}|${dateIso}`)) return;
    out.push({
      id: `fx-${f.id}-${dateIso}`,
      day: dayIdx,
      name: emp.name,
      start: f.start_time || "",
      end: f.end_time || "",
      role: f.role || "",
      _virtual: true,
      _empId: f.employee_id,
      _date: dateIso,
    });
  });
  return out;
}

// 실제 + 가상 병합 (같은 사람+요일 실제 있으면 가상 숨김)
export function mergeReal(real, virtual) {
  const realKey = new Set(real.map((s) => `${s.name}|${s.day}`));
  return [...real, ...virtual.filter((v) => !realKey.has(`${v.name}|${v.day}`))];
}
