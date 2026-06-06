import { useState } from "react";
import { C } from "../lib/constants";

const TIPS = [
  {
    q: "❓ 5인 이하면 야간수당 안 줘도 되나요?",
    a: [
      "정확히는 '5인 미만(직원 4명 이하)'이면 안 줘도 됩니다. 직원이 5명부터(5인 이상)는 꼭 줘야 해요.",
      "• 5인 이상 → 야간(밤 22시~새벽 6시)·연장·휴일 근무에 50% 가산수당 의무",
      "• 5인 미만 → 이 가산수당은 법적 의무가 아님 (안 줘도 됨, 단 최저임금·주휴수당은 인원과 무관하게 적용)",
      "여기서 인원은 사장님을 뺀 '상시근로자' 수예요. 이 앱은 직원마다 '야간수당 지급'을 켜고 끌 수 있게 했어요.",
    ],
  },
  {
    q: "💰 최저임금은 얼마인가요?",
    a: [
      "2026년 최저임금은 시급 10,320원이에요. (월급 환산 약 2,156,880원 — 주 40시간·월 209시간 기준)",
      "최저임금은 매년 1월 1일에 바뀌니, 새해엔 '올해 최저임금'으로 검색하거나 고용노동부(☎1350)에서 확인하세요.",
      "수습기간이어도 단순노무직(편의점 알바 등)은 최저임금을 100% 줘야 합니다.",
    ],
  },
  {
    q: "🌴 주휴수당이 뭔가요?",
    a: [
      "1주일에 15시간 이상 일하고, 그 주에 빠짐없이 출근하면 '하루치 유급휴일'을 더 줘야 해요. 이게 주휴수당입니다.",
      "계산: (1주 근무시간 ÷ 40) × 8 × 시급",
      "예) 주 30시간·시급 10,320원 → (30÷40)×8×10,320 = 61,920원 추가",
      "주 15시간 미만이면 주휴수당은 없습니다.",
    ],
  },
  {
    q: "🌙 야간수당 계산은 어떻게 하나요?",
    a: [
      "밤 22시~다음날 06시 사이에 일한 시간은 시급의 1.5배로 칩니다. (기본 100% + 야간가산 50%)",
      "예) 시급 10,320원으로 22시~06시(8시간) → 기본 82,560 + 야간가산 41,280 = 123,840원",
      "단, 이 가산은 5인 이상 사업장만 의무예요.",
    ],
  },
  {
    q: "📋 4대보험은 언제 가입하나요?",
    a: [
      "한 달에 60시간 이상(대략 주 15시간 이상) 일하면 4대보험(국민연금·건강보험·고용보험·산재) 가입 대상입니다.",
      "산재보험은 단 1명만 써도 무조건 가입(보험료는 사장님 부담).",
      "초단시간(주 15시간 미만)은 국민연금·건강보험·고용보험이 빠지기도 해요.",
    ],
  },
  {
    q: "⚠️ 알바한테 3.3%만 떼면 되나요?",
    a: [
      "주의! 알바(아르바이트)는 보통 '근로자'라서 3.3%가 아니라 4대보험 대상이에요.",
      "3.3% 원천징수는 프리랜서·사업소득자에게 쓰는 방식입니다.",
      "알바에게 4대보험을 피하려고 3.3%로 신고하면 나중에 세금·보험료 추징, 과태료가 나올 수 있어요. 세무사와 상담을 권합니다.",
    ],
  },
  {
    q: "📝 근로계약서, 꼭 써야 하나요?",
    a: [
      "네, 알바·단기직도 반드시 서면으로 작성하고 1부를 직원에게 줘야 합니다.",
      "안 쓰면 500만원 이하 과태료가 나올 수 있어요.",
      "임금·근무시간·휴게시간·근무일을 적어두면 분쟁도 예방됩니다.",
    ],
  },
  {
    q: "🎁 퇴직금은 언제 주나요?",
    a: [
      "1년 이상 + 주 15시간 이상 일한 직원이 그만두면 퇴직금을 줘야 합니다.",
      "대략 '한 달 평균임금 × 근속연수' 만큼이에요.",
      "알바라도 조건을 채우면 지급 의무가 있습니다.",
    ],
  },
  {
    q: "🍔 휴게시간은 어떻게 주나요?",
    a: [
      "4시간 일하면 30분 이상, 8시간 일하면 1시간 이상 휴게시간을 근무 중간에 줘야 해요.",
      "휴게시간은 무급이며, 그 시간엔 자유롭게 쉴 수 있어야 합니다.",
    ],
  },
];

export default function TipsModal({ onClose }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ background: C.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg font-bold" style={{ color: C.ink }}>💡 인건비·세무 꿀팁</div>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
        </div>
        <div className="text-sm mb-4" style={{ color: C.sub }}>사장님이 알아두면 좋은 기본 상식이에요. 항목을 누르면 펼쳐져요.</div>

        <div className="space-y-2">
          {TIPS.map((t, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
                <button onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full text-left px-3 py-2.5 font-semibold text-sm flex items-center justify-between gap-2"
                  style={{ color: C.ink, background: isOpen ? "#E9F6F3" : "#F8F7F3" }}>
                  <span>{t.q}</span>
                  <span style={{ color: C.sub }}>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="px-3 py-2.5 text-sm space-y-1.5" style={{ color: C.ink, lineHeight: 1.6 }}>
                    {t.a.map((line, k) => (
                      <div key={k} style={{ color: line.startsWith("•") || line.startsWith("예") ? C.sub : C.ink }}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-[11px] mt-4 rounded-lg px-3 py-2" style={{ background: "#FFF4DA", color: "#9A6B00" }}>
          ※ 참고용 안내예요. 법·금액은 매년 바뀌니 정확한 내용은 고용노동부(☎1350)나 세무사·노무사와 확인하세요.
        </div>

        <button onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 rounded-lg font-semibold text-white" style={{ background: C.accent }}>
          닫기
        </button>
      </div>
    </div>
  );
}
