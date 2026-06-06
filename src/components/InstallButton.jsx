import { useState, useEffect } from "react";
import { C } from "../lib/constants";

// 아이폰/아이패드 감지 (홈 화면 추가 방식이 안드로이드와 다름)
function isIOS() {
  const ua = navigator.userAgent || "";
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
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
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault(); // 브라우저 기본 배너 막고 우리 버튼으로
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const ios = isIOS();
  // 안드로이드/PC는 설치 가능할 때만, 아이폰은 항상(안내용) 노출
  if (!deferred && !ios) return null;

  const onClick = async () => {
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch { /* ignore */ }
      setDeferred(null);
    } else if (ios) {
      setShowIosHelp(true);
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

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(20,20,18,0.45)" }}
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5"
            style={{ background: C.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold" style={{ color: C.ink }}>아이폰 홈 화면에 추가</div>
              <button onClick={() => setShowIosHelp(false)} className="text-2xl leading-none px-2" style={{ color: C.sub }}>×</button>
            </div>
            <ol className="text-sm space-y-2" style={{ color: C.ink }}>
              <li>1. 화면 아래 <b>공유 버튼</b> <span style={{ color: C.accent }}>⬆️</span> 를 누르세요. (사각형에서 위로 화살표)</li>
              <li>2. 메뉴를 내려서 <b>“홈 화면에 추가”</b> 를 누르세요.</li>
              <li>3. 오른쪽 위 <b>“추가”</b> 를 누르면 끝! 홈 화면에 아이콘이 생겨요.</li>
            </ol>
            <div className="text-xs mt-3 rounded-lg px-3 py-2" style={{ background: "#FFF4DA", color: "#9A6B00" }}>
              ※ 꼭 <b>사파리(Safari)</b> 브라우저에서 열어야 보여요. (크롬·카톡 내부 브라우저는 안 될 수 있어요)
            </div>
            <button
              onClick={() => setShowIosHelp(false)}
              className="w-full mt-4 px-4 py-2.5 rounded-lg font-semibold text-white"
              style={{ background: C.accent }}
            >
              알겠어요
            </button>
          </div>
        </div>
      )}
    </>
  );
}
