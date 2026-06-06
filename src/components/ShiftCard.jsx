import { C, BAND } from "../lib/constants";
import { band, personColor } from "../lib/dateUtils";

/* ---------- shift card ---------- */
export default function ShiftCard({ s, onClick }) {
  const b = BAND[band(s.start)];
  const pc = personColor(s.name);
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg mb-2 overflow-hidden flex shadow-sm hover:shadow transition"
      style={{ background: "#fff", border: `1px solid ${C.line}` }}
    >
      <div style={{ width: 5, background: b.bar, flexShrink: 0 }} />
      <div className="px-2.5 py-2 w-full">
        <div className="flex items-center gap-1.5">
          <span style={{ width: 11, height: 11, borderRadius: 11, background: pc, flexShrink: 0 }} />
          <span className="font-bold text-base truncate" style={{ color: C.ink }}>{s.name}</span>
        </div>
        {(s.start || s.end) && (
          <div className="text-sm mt-0.5" style={{ color: C.sub }}>
            {s.start || "?"} ~ {s.end || "?"}
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {s.role && (
            <span className="text-sm px-1.5 py-0.5 rounded" style={{ background: "#F0EFEA", color: C.sub }}>
              {s.role}
            </span>
          )}
        </div>
        {s.memo && <div className="text-sm mt-1 italic" style={{ color: C.sub }}>※ {s.memo}</div>}
      </div>
    </button>
  );
}
