import { PERSON_COLORS } from "./constants";

/* ---------- date / util helpers ---------- */
export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getMonday(d) {
  const date = new Date(d);
  const wd = date.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtMD(x) {
  return `${x.getMonth() + 1}.${x.getDate()}`;
}

// 직원 명단에서 지정한 커스텀 색 (이름 -> hex). App이 채워줌.
let COLOR_OVERRIDE = {};
export function setColorOverrides(map) {
  COLOR_OVERRIDE = map || {};
}

// 이름으로 고정 색상 결정 (커스텀 색이 있으면 우선)
export function personColor(name) {
  if (name && COLOR_OVERRIDE[name]) return COLOR_OVERRIDE[name];
  let h = 0;
  const s = name || "";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PERSON_COLORS[h % PERSON_COLORS.length];
}

// 시작 시간으로 시간대 분류
export function band(start) {
  if (!start) return "none";
  const h = parseInt(start.split(":")[0], 10);
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "night";
}

// 근무 시간 계산 (자정 넘김 처리 포함)
export function hours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
