import { C } from "../lib/constants";

/* Supabase 키가 아직 없을 때 보여주는 안내 화면 (흰 화면 방지) */
export default function SetupNotice() {
  return (
    <div
      style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'IBM Plex Sans KR', sans-serif" }}
      className="flex items-center justify-center p-5"
    >
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: "'Do Hyeon', sans-serif", fontSize: 26, lineHeight: 1.2 }}>
          편의점 <span style={{ color: C.accent }}>시프트표</span>
        </div>
        <div className="mt-3 text-sm" style={{ color: C.sub }}>
          아직 데이터베이스(Supabase) 연결이 설정되지 않았어요.
        </div>

        <div className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: "#FFF4DA", color: "#9A6B00" }}>
          프로젝트 폴더에 <b>.env</b> 파일을 만들고 아래 두 줄을 채운 뒤,
          개발 서버를 다시 시작하면 앱이 켜집니다.
        </div>

        <pre
          className="mt-4 rounded-lg px-4 py-3 text-xs overflow-x-auto"
          style={{ background: "#1E1E1C", color: "#E6E2D8" }}
        >{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...(긴 키)`}</pre>

        <div className="mt-4 text-xs" style={{ color: C.sub }}>
          이 값은 Supabase 대시보드 → <b>Project Settings → API</b> 에서 복사할 수 있어요.
          자세한 단계는 함께 받은 <b>SUPABASE_설정안내.md</b> 를 참고하세요.
        </div>
      </div>
    </div>
  );
}
