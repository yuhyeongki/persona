import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트 (service role 키 사용).
 * 이 파일은 API 라우트와 서버 컴포넌트에서만 import 하세요.
 */
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
