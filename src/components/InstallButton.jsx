import { useState, useEffect } from "react";
import { C } from "../lib/constants";

const ua = () => navigator.userAgent || "";

// 아이폰/아이패드 감지
function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(ua()) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
function isAndroid() {
  return /android/i.test(ua());
}
// 카톡/인스타 등 인앱 브라우저 (여기선 홈화면 추가가 막혀 있음)
function isInApp() {
  return /KAKAOTALK|Instagram|FBAN|FBAV|Line|NAVER|DaumApps/i.test(ua());
}
// 이미 홈 화면 앱으로 실행 중인지
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallButton() {
  const [deferred, setDeferred] = useState(null); // 안드로이드/크롬 설치 프롬프트
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault(); // 브라우저 기본 배너 막고 우리 버튼으로
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null; // 이미 설치됨 → 버튼 숨김

  const onClick = async () => {
    if (deferred) {
      // 안드로이드/크롬: 네이티브 설치창 바로 띄우기
      deferred.prompt();
      try { await deferred.userChoice; } catch { /* ignore */ }
      setDeferred(null);
    } else {
      // 그 외: 기기별 방법 안내
      setShowHelp(true);
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        className="text-sm font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
        style={{ background: C.accent, color: "#fff" }}
      >
        📲 홈 화면에 추가
      </button>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}

/* 기기별 설치 방법 안내 */
function HelpModal({ onClose }) {
  const ios = isIOS();
  const android = isAndroid();
  const inApp = isInApp();

  let title = "홈 화면에 추가하기";
  let steps;
  if (inApp) {
    title = "먼저 브라우저로 열어주세요";
    steps = (
      <ol className="text-sm space-y-2" style={{ color: C.ink }}>
        <li>1. 지금은 카톡/SNS 안의 브라우저라 추가가 안 돼요.</li>
        <li>2. 오른쪽 위 <b>⋯ (점 세 개)</b> → <b>“다른 브라우저로 열기”</b> 또는 <b>“Safari/Chrome으로 열기”</b> 를 누르세요.</li>
        <li>3. 그 다음 이 버튼을 다시 누르면 추가 방법이 나와요.</li>
      </ol>
    );
  } else if (ios) {
    steps = (
      <ol className="text-sm space-y-2" style={{ color: C.ink }}>
        <li>1. 화면 <b>아래쪽 공유 버튼</b> <span style={{ color: C.accent }}>⬆️</span> 를 누르세요. (네모에서 위로 화살표)</li>
        <li>2. 메뉴를 내려 <b>“홈 화면에 추가”</b> 를 누르세요.</li>
        <li>3. 오른쪽 위 <b>“추가”</b> → 홈 화면에 아이콘이 생겨요!</li>
      </ol>
    );
  } else if (android) {
    steps = (
      <ol className="text-sm space-y-2" style={{ color: C.ink }}>
        <li>1. 오른쪽 위 <b>⋮ (점 세 개)</b> 메뉴를 누르세요.</li>
        <li>2. <b>“앱 설치”</b> 또는 <b>“홈 화면에 추가”</b> 를 누르세요.</li>
        <li>3. <b>“설치/추가”</b> → 홈 화면에 아이콘이 생겨요!</li>
      </ol>
    );
  } else {
    steps = (
      <ol className="text-sm space-y-2" style={{ color: C.ink }}>
        <li>1. 브라우저 주소창 오른쪽의 <b>설치 아이콘</b>(⊕ 또는 모니터 모양)을 누르세요.</li>
        <li>2. <b>“설치”</b> 를 누르면 앱처럼 바로 열 수 있어요.</li>
      </ol>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(20,20,18,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: C.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold" style={{ color: C.ink }}>{title}</div>
          <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
        </div>
        {steps}
        {ios && !inApp && (
          <div className="text-xs mt-3 rounded-lg px-3 py-2" style={{ background: "#FFF4DA", color: "#9A6B00" }}>
            ※ 꼭 <b>사파리(Safari)</b> 에서 열어야 보여요.
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 rounded-lg font-semibold text-white"
          style={{ background: C.accent }}
        >
          알겠어요
        </button>
      </div>
    </div>
  );
}
