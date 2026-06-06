import { createClient } from "@supabase/supabase-js";

/* ============================================================
 *  Supabase 클라이언트
 *  ------------------------------------------------------------
 *  키는 .env 파일에서 읽어옵니다 (VITE_ 접두사 필수).
 *  .env 가 아직 없으면 isSupabaseConfigured 가 false 가 되어,
 *  앱이 "설정 안내" 화면을 보여줍니다(흰 화면 대신).
 * ============================================================ */

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;
