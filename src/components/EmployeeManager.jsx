import { useState } from "react";
import { C, PERSON_COLORS, DAY_NAMES, ROLE_PRESETS } from "../lib/constants";
import {
  insertEmployee, updateEmployee, deleteEmployee,
  insertFixed, deleteFixed,
} from "../lib/db";

export default function EmployeeManager({ employees, fixedShifts, onClose, onChanged }) {
  const [editing, setEditing] = useState(null); // null | "new" | employee

  if (editing) {
    return (
      <Shell onClose={onClose} title={editing === "new" ? "직원 추가" : "직원 정보"}>
        <EmployeeEditor
          employee={editing === "new" ? null : editing}
          fixedShifts={editing === "new" ? [] : fixedShifts.filter((f) => f.employee_id === editing.id)}
          onBack={() => setEditing(null)}
          onChanged={onChanged}
        />
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose} title="직원 관리">
      <div className="space-y-2">
        {employees.length === 0 && (
          <div className="text-sm text-center py-6" style={{ color: C.sub }}>
            아직 등록된 직원이 없어요.<br />아래 “＋ 직원 추가”로 시작하세요.
          </div>
        )}
        {employees.map((e) => {
          const fcount = fixedShifts.filter((f) => f.employee_id === e.id).length;
          const pay = e.pay_type === "monthly"
            ? `월급 ${Number(e.monthly_pay || 0).toLocaleString()}원`
            : `시급 ${Number(e.wage || 0).toLocaleString()}원`;
          return (
            <button key={e.id} onClick={() => setEditing(e)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left"
              style={{ background: "#F8F7F3", border: `1px solid ${C.line}` }}>
              <span style={{ width: 14, height: 14, borderRadius: 14, background: e.color || "#CBD5E1", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: C.ink }}>
                  {e.name} {e.active === false && <span className="text-xs" style={{ color: C.sub }}>(숨김)</span>}
                </div>
                <div className="text-xs" style={{ color: C.sub }}>{pay} · 고정근무 {fcount}건</div>
              </div>
              <span style={{ color: C.sub }}>›</span>
            </button>
          );
        })}
      </div>
      <button onClick={() => setEditing("new")}
        className="w-full mt-4 py-2.5 rounded-lg font-semibold border border-dashed"
        style={{ color: C.accent, borderColor: C.accent }}>
        ＋ 직원 추가
      </button>
    </Shell>
  );
}

function EmployeeEditor({ employee, fixedShifts, onBack, onChanged }) {
  const isNew = !employee?.id;
  const [name, setName] = useState(employee?.name || "");
  const [color, setColor] = useState(employee?.color || PERSON_COLORS[0]);
  const [payType, setPayType] = useState(employee?.pay_type || "hourly");
  const [wage, setWage] = useState(employee?.wage ? String(employee.wage) : "");
  const [monthlyPay, setMonthlyPay] = useState(employee?.monthly_pay ? String(employee.monthly_pay) : "");
  const [memo, setMemo] = useState(employee?.memo || "");
  const [active, setActive] = useState(employee?.active !== false);
  const [weeklyAllow, setWeeklyAllow] = useState(!!employee?.weekly_allowance);
  const [nightAllow, setNightAllow] = useState(!!employee?.night_allowance);
  const [joinDate, setJoinDate] = useState(employee?.join_date || "");
  const [firstWorkDate, setFirstWorkDate] = useState(employee?.first_work_date || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // 신규 등록 시 임시 보관할 고정근무
  const [pending, setPending] = useState([]);

  const [fDays, setFDays] = useState([]);
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fRole, setFRole] = useState("");

  const monthly = payType === "monthly";
  const inputStyle = { borderColor: C.line, color: C.ink };
  const toggleDay = (d) => setFDays((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);

  const buildPayload = () => ({
    id: employee?.id, name: name.trim(), color,
    pay_type: payType,
    wage: monthly ? 0 : (parseInt(wage, 10) || 0),
    monthly_pay: monthly ? (parseInt(monthlyPay, 10) || 0) : 0,
    memo: memo.trim(), active,
    weekly_allowance: monthly ? false : weeklyAllow,
    night_allowance: monthly ? false : nightAllow,
    join_date: joinDate || null, first_work_date: firstWorkDate || null,
  });

  const saveEmployee = async () => {
    if (!name.trim()) { setErr("이름을 입력해 주세요."); return; }
    setBusy(true);
    try {
      if (employee?.id) {
        await updateEmployee(buildPayload());
      } else {
        const created = await insertEmployee(buildPayload());
        // 신규 등록 시 임시 고정근무도 함께 저장
        for (const f of pending) {
          await insertFixed({ employee_id: created.id, day: f.day, start_time: f.start, end_time: f.end, role: f.role });
        }
      }
      await onChanged();
      onBack();
    } catch (e) { setErr(e?.message || "저장 실패"); }
    finally { setBusy(false); }
  };

  const removeEmployee = async () => {
    if (!confirm(`'${employee.name}' 직원을 삭제할까요? 고정근무·휴무도 함께 삭제됩니다.`)) return;
    setBusy(true);
    try { await deleteEmployee(employee.id); await onChanged(); onBack(); }
    catch (e) { setErr(e?.message || "삭제 실패"); }
    finally { setBusy(false); }
  };

  const addFixed = async () => {
    if (fDays.length === 0) { setErr("요일을 한 개 이상 선택하세요."); return; }
    if (isNew) {
      // 임시 보관 (직원 저장 시 함께 등록)
      setPending((cur) => [
        ...cur,
        ...fDays.map((d) => ({ tempId: `${d}-${cur.length}-${fStart}`, day: d, start: fStart, end: fEnd, role: fRole.trim() })),
      ]);
      setFDays([]); setFStart(""); setFEnd(""); setFRole(""); setErr("");
      return;
    }
    setBusy(true);
    try {
      for (const d of fDays) {
        await insertFixed({ employee_id: employee.id, day: d, start_time: fStart, end_time: fEnd, role: fRole.trim() });
      }
      setFDays([]); setFStart(""); setFEnd(""); setFRole("");
      await onChanged();
    } catch (e) { setErr(e?.message || "추가 실패"); }
    finally { setBusy(false); }
  };

  const delFixed = async (item) => {
    if (isNew) { setPending((cur) => cur.filter((f) => f.tempId !== item.tempId)); return; }
    setBusy(true);
    try { await deleteFixed(item.id); await onChanged(); }
    catch (e) { setErr(e?.message || "삭제 실패"); }
    finally { setBusy(false); }
  };

  const fixedList = isNew
    ? pending.map((f) => ({ ...f, start_time: f.start, end_time: f.end }))
    : fixedShifts;

  return (
    <div>
      <button onClick={onBack} className="text-sm mb-3" style={{ color: C.accent }}>‹ 목록으로</button>

      <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>이름</label>
      <input value={name} onChange={(e) => { setName(e.target.value); setErr(""); }}
        placeholder="예: 김알바" className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />

      <label className="block text-sm font-semibold mb-1 mt-3" style={{ color: C.ink }}>색상</label>
      <div className="flex flex-wrap gap-2">
        {PERSON_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            style={{ width: 28, height: 28, borderRadius: 28, background: c, border: color === c ? "3px solid #2A2A28" : "2px solid #fff", boxShadow: "0 0 0 1px #E6E2D8" }} />
        ))}
      </div>

      {/* 급여 형태 */}
      <label className="block text-sm font-semibold mb-1 mt-3" style={{ color: C.ink }}>급여 형태</label>
      <div className="flex gap-2 mb-2">
        {[["hourly", "시급제"], ["monthly", "월급제"]].map(([v, l]) => (
          <button key={v} onClick={() => setPayType(v)}
            className="flex-1 py-2 rounded-lg font-semibold text-sm border"
            style={payType === v ? { background: C.accent, color: "#fff", borderColor: C.accent } : { background: "#fff", color: C.sub, borderColor: C.line }}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>{monthly ? "월급(원)" : "시급(원)"}</label>
          {monthly ? (
            <input value={monthlyPay} onChange={(e) => setMonthlyPay(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric" placeholder="예: 2200000"
              className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />
          ) : (
            <input value={wage} onChange={(e) => setWage(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric" placeholder="예: 10030"
              className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />
          )}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>표시</label>
          <button onClick={() => setActive((v) => !v)}
            className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ borderColor: C.line, color: active ? C.accent : C.sub, background: "#fff" }}>
            {active ? "근무 중" : "숨김(퇴사 등)"}
          </button>
        </div>
      </div>

      {/* 수당 (시급제만) */}
      {!monthly && (
        <div className="flex flex-col gap-2 mt-3">
          <button onClick={() => setWeeklyAllow((v) => !v)}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 border text-sm"
            style={{ borderColor: weeklyAllow ? C.accent : C.line, background: weeklyAllow ? "#E9F6F3" : "#fff" }}>
            <span style={{ color: C.ink }}>주휴수당 지급 <span style={{ color: C.sub }}>(주 15시간 이상 시)</span></span>
            <span className="font-bold" style={{ color: weeklyAllow ? C.accent : C.sub }}>{weeklyAllow ? "✓ 지급" : "미지급"}</span>
          </button>
          <button onClick={() => setNightAllow((v) => !v)}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 border text-sm"
            style={{ borderColor: nightAllow ? C.accent : C.line, background: nightAllow ? "#E9F6F3" : "#fff" }}>
            <span style={{ color: C.ink }}>야간수당 지급 <span style={{ color: C.sub }}>(22~06시 ×1.5)</span></span>
            <span className="font-bold" style={{ color: nightAllow ? C.accent : C.sub }}>{nightAllow ? "✓ 지급" : "미지급"}</span>
          </button>
        </div>
      )}

      {/* 입사일 / 첫 근무일 */}
      <div className="flex gap-3 mt-3">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>입사일</label>
          <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1" style={{ color: C.ink }}>첫 근무일</label>
          <input type="date" value={firstWorkDate} onChange={(e) => setFirstWorkDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />
        </div>
      </div>
      <div className="text-[11px] mt-1" style={{ color: C.sub }}>첫 근무일 이전 날짜는 “고정근무 채우기”에서 자동 제외돼요.</div>

      <label className="block text-sm font-semibold mb-1 mt-3" style={{ color: C.ink }}>메모</label>
      <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 주말만 가능"
        className="w-full border rounded-lg px-3 py-2 outline-none" style={inputStyle} />

      {/* 고정근무 (신규/기존 모두 가능) */}
      <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="font-bold text-sm mb-2" style={{ color: C.ink }}>⏰ 고정근무 (매주 반복)</div>

        {fixedList.length > 0 && (
          <div className="space-y-1 mb-3">
            {[...fixedList].sort((a, b) => a.day - b.day).map((f) => (
              <div key={f.id || f.tempId} className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5" style={{ background: "#F4F3EE" }}>
                <span className="font-semibold" style={{ color: C.ink }}>{DAY_NAMES[f.day]}</span>
                <span style={{ color: C.sub }}>{f.start_time || "?"}~{f.end_time || "?"}{f.role ? ` · ${f.role}` : ""}</span>
                <button onClick={() => delFixed(f)} className="ml-auto text-sm" style={{ color: "#C0392B" }}>삭제</button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg p-3" style={{ background: "#FAF9F6", border: `1px solid ${C.line}` }}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DAY_NAMES.map((dn, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className="text-sm w-9 h-9 rounded-full border"
                style={fDays.includes(i) ? { background: C.accent, color: "#fff", borderColor: C.accent } : { background: "#fff", color: C.sub, borderColor: C.line }}>
                {dn}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <input type="time" value={fStart} onChange={(e) => setFStart(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-2 outline-none" style={inputStyle} />
            <input type="time" value={fEnd} onChange={(e) => setFEnd(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-2 outline-none" style={inputStyle} />
          </div>
          <input value={fRole} onChange={(e) => setFRole(e.target.value)}
            list="role-presets" placeholder="역할 (예: 오픈)"
            className="w-full border rounded-lg px-3 py-2 outline-none mb-2" style={inputStyle} />
          <datalist id="role-presets">
            {ROLE_PRESETS.map((r) => <option key={r} value={r} />)}
          </datalist>
          <button onClick={addFixed} disabled={busy}
            className="w-full py-2 rounded-lg font-semibold text-sm text-white" style={{ background: C.accent }}>
            ＋ 고정근무 추가
          </button>
          <div className="text-[11px] mt-2" style={{ color: C.sub }}>요일을 여러 개 선택할 수 있어요.</div>
        </div>
      </div>

      {err && <div className="text-xs mt-3" style={{ color: "#D81B60" }}>{err}</div>}

      <div className="flex gap-2 mt-5">
        {employee?.id && (
          <button onClick={removeEmployee} disabled={busy}
            className="px-4 py-2.5 rounded-lg font-semibold border"
            style={{ color: "#C0392B", borderColor: "#F3CFC9", background: "#FCF1EF" }}>삭제</button>
        )}
        <button onClick={onBack} className="flex-1 px-4 py-2.5 rounded-lg font-semibold border"
          style={{ color: C.sub, borderColor: C.line, background: "#fff" }}>취소</button>
        <button onClick={saveEmployee} disabled={busy}
          className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white" style={{ background: C.accent }}>저장</button>
      </div>
    </div>
  );
}

function Shell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ background: C.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold" style={{ color: C.ink }}>{title}</div>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
