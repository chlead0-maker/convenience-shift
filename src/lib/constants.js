/* ---------- shared constants ---------- */
export const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];
export const ROLE_PRESETS = ["오픈", "미들", "마감", "계산", "발주", "청소", "물류"];
export const PERSON_COLORS = [
  "#E8743B", "#1B9E77", "#3B6EA8", "#8E44AD", "#D81B60",
  "#00897B", "#5C6BC0", "#C0392B", "#0277BD", "#7CB342",
];

// 팔레트 (color tokens)
export const C = {
  bg: "#F6F4EF",
  card: "#FFFFFF",
  ink: "#2A2A28",
  sub: "#6B6B66",
  line: "#E6E2D8",
  accent: "#0E9F8E",
  accentDark: "#0B7D70",
};

// 시간대 색 구분 (time bands)
export const BAND = {
  morning: { bar: "#F2B705", label: "오전" },
  afternoon: { bar: "#2BA6A6", label: "오후" },
  night: { bar: "#5B5BD6", label: "야간" },
  none: { bar: "#CBD5E1", label: "" },
};
